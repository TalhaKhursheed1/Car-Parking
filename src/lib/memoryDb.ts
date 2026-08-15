import { ObjectId } from "mongodb";

type Doc = Record<string, unknown> & { _id?: ObjectId };

declare global {
  // eslint-disable-next-line no-var
  var __memoryCollections: Map<string, Doc[]> | undefined;
}

function store(): Map<string, Doc[]> {
  if (!global.__memoryCollections) {
    global.__memoryCollections = new Map();
  }
  return global.__memoryCollections;
}

function idsEqual(a: unknown, b: unknown): boolean {
  if (a instanceof ObjectId && b instanceof ObjectId) return a.equals(b);
  if (a instanceof ObjectId) return a.toString() === String(b);
  if (b instanceof ObjectId) return b.toString() === String(a);
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

function getPath(doc: Doc, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, doc);
}

function cmp(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function matchQuery(doc: Doc, query: Record<string, unknown> | undefined): boolean {
  if (!query || Object.keys(query).length === 0) return true;

  if (query.$or && Array.isArray(query.$or)) {
    if (!query.$or.some((part) => matchQuery(doc, part as Record<string, unknown>))) {
      return false;
    }
  }

  for (const [key, condition] of Object.entries(query)) {
    if (key === "$or") continue;
    const value = getPath(doc, key);
    if (!matchCondition(value, condition, doc)) return false;
  }
  return true;
}

function matchCondition(value: unknown, condition: unknown, doc: Doc): boolean {
  if (condition instanceof RegExp) {
    return typeof value === "string" && condition.test(value);
  }

  if (condition && typeof condition === "object" && !(condition instanceof ObjectId) && !(condition instanceof Date) && !Array.isArray(condition)) {
    const ops = condition as Record<string, unknown>;
    const operatorKeys = Object.keys(ops).filter((k) => k.startsWith("$"));
    if (operatorKeys.length > 0) {
      for (const op of operatorKeys) {
        const rhs = ops[op];
        if (op === "$in") {
          if (!Array.isArray(rhs) || !rhs.some((item) => idsEqual(value, item))) return false;
        } else if (op === "$gte") {
          if (cmp(value, rhs) < 0) return false;
        } else if (op === "$lte") {
          if (cmp(value, rhs) > 0) return false;
        } else if (op === "$gt") {
          if (cmp(value, rhs) <= 0) return false;
        } else if (op === "$lt") {
          if (cmp(value, rhs) >= 0) return false;
        } else if (op === "$ne") {
          if (idsEqual(value, rhs)) return false;
        } else if (op === "$regex") {
          const flags = typeof ops.$options === "string" ? ops.$options : "";
          const re = rhs instanceof RegExp ? rhs : new RegExp(String(rhs), flags);
          if (typeof value !== "string" || !re.test(value)) return false;
        } else if (op === "$elemMatch") {
          if (!Array.isArray(value)) return false;
          const sub = rhs as Record<string, unknown>;
          if (!value.some((item) => matchQuery(item as Doc, sub))) return false;
        }
      }
      return true;
    }
  }

  return idsEqual(value, condition);
}

function applyUpdate(doc: Doc, update: Record<string, unknown>, isInsert: boolean): void {
  const set = (update.$set as Record<string, unknown> | undefined) ?? {};
  const setOnInsert = (update.$setOnInsert as Record<string, unknown> | undefined) ?? {};
  Object.assign(doc, set);
  if (isInsert) Object.assign(doc, setOnInsert);
}

class MemoryCursor {
  constructor(
    private docs: Doc[],
    private sortSpec?: Record<string, 1 | -1>,
    private skipCount = 0,
    private limitCount = Number.POSITIVE_INFINITY,
  ) {}

  sort(spec: Record<string, 1 | -1>) {
    return new MemoryCursor(this.docs, spec, this.skipCount, this.limitCount);
  }

  skip(n: number) {
    return new MemoryCursor(this.docs, this.sortSpec, n, this.limitCount);
  }

  limit(n: number) {
    return new MemoryCursor(this.docs, this.sortSpec, this.skipCount, n);
  }

  project(_projection?: unknown) {
    return this;
  }

  async toArray(): Promise<Doc[]> {
    let rows = [...this.docs];
    if (this.sortSpec) {
      const [[field, dir]] = Object.entries(this.sortSpec);
      rows.sort((a, b) => cmp(getPath(a, field), getPath(b, field)) * dir);
    }
    rows = rows.slice(this.skipCount, this.skipCount + this.limitCount);
    return rows.map((d) => ({ ...d }));
  }
}

class MemoryCollection {
  constructor(private name: string) {}

  private docs(): Doc[] {
    const map = store();
    if (!map.has(this.name)) map.set(this.name, []);
    return map.get(this.name)!;
  }

  find(query: Record<string, unknown> = {}) {
    return new MemoryCursor(this.docs().filter((d) => matchQuery(d, query)));
  }

  async findOne(query: Record<string, unknown> = {}, _options?: unknown): Promise<Doc | null> {
    const found = this.docs().find((d) => matchQuery(d, query));
    return found ? { ...found } : null;
  }

  async insertOne(doc: Doc, _options?: unknown) {
    const copy: Doc = { ...doc, _id: doc._id instanceof ObjectId ? doc._id : new ObjectId() };
    this.docs().push(copy);
    return { insertedId: copy._id, acknowledged: true };
  }

  async updateOne(query: Record<string, unknown>, update: Record<string, unknown>, options?: { upsert?: boolean }) {
    const list = this.docs();
    const index = list.findIndex((d) => matchQuery(d, query));
    if (index >= 0) {
      applyUpdate(list[index], update, false);
      return { matchedCount: 1, modifiedCount: 1, upsertedId: null, acknowledged: true };
    }
    if (options?.upsert) {
      const created: Doc = { _id: new ObjectId() };
      applyUpdate(created, update, true);
      Object.assign(created, query);
      list.push(created);
      return { matchedCount: 0, modifiedCount: 0, upsertedId: created._id, acknowledged: true };
    }
    return { matchedCount: 0, modifiedCount: 0, upsertedId: null, acknowledged: true };
  }

  async updateMany(query: Record<string, unknown>, update: Record<string, unknown>) {
    const list = this.docs();
    let modifiedCount = 0;
    for (const doc of list) {
      if (matchQuery(doc, query)) {
        applyUpdate(doc, update, false);
        modifiedCount += 1;
      }
    }
    return { matchedCount: modifiedCount, modifiedCount, acknowledged: true };
  }

  async deleteOne(query: Record<string, unknown>) {
    const list = this.docs();
    const index = list.findIndex((d) => matchQuery(d, query));
    if (index < 0) return { deletedCount: 0, acknowledged: true };
    list.splice(index, 1);
    return { deletedCount: 1, acknowledged: true };
  }

  async countDocuments(query: Record<string, unknown> = {}, _options?: unknown) {
    return this.docs().filter((d) => matchQuery(d, query)).length;
  }

  async findOneAndUpdate(
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    _options?: { returnDocument?: string },
  ) {
    await this.updateOne(query, update);
    return this.findOne(query);
  }

  async createIndexes(_indexes: unknown) {
    return [];
  }

  async createIndex(_index: unknown) {
    return `${this.name}_idx`;
  }
}

export class MemoryDb {
  collection<T = Doc>(name: string) {
    return new MemoryCollection(name) as unknown as import("mongodb").Collection<T>;
  }
}

export class MemoryMongoClient {
  db(_name?: string) {
    return new MemoryDb() as unknown as import("mongodb").Db;
  }

  async connect() {
    return this as unknown as import("mongodb").MongoClient;
  }

  async withSession<T>(fn: (session: { withTransaction: <R>(cb: () => Promise<R>) => Promise<R> }) => Promise<T>) {
    const session = {
      withTransaction: async <R>(cb: () => Promise<R>) => cb(),
    };
    return fn(session);
  }
}

export function isMemoryMongoUri(uri: string | undefined): boolean {
  return Boolean(uri && (uri === "memory://" || uri.startsWith("memory://")));
}
