import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';

export type SystemSettings = {
  siteName: string;
  maxBookingDays: number;
  maintenanceMode: boolean;
  autoApproveSpaces: boolean;
  updatedAt: Date;
  updatedBy: ObjectId | null;
};

type SystemSettingsDoc = SystemSettings & {
  _id?: ObjectId;
  key: 'global';
};

const COLLECTION = 'system_settings';
const SETTINGS_KEY: SystemSettingsDoc['key'] = 'global';

export const DEFAULT_SYSTEM_SETTINGS: Omit<SystemSettings, 'updatedAt' | 'updatedBy'> = {
  siteName: 'ParkSpace',
  maxBookingDays: 30,
  maintenanceMode: false,
  autoApproveSpaces: false,
};

function coerce(doc?: Partial<SystemSettingsDoc> | null): SystemSettings {
  return {
    siteName:
      typeof doc?.siteName === 'string' && doc.siteName.trim()
        ? doc.siteName.trim().slice(0, 100)
        : DEFAULT_SYSTEM_SETTINGS.siteName,
    maxBookingDays:
      typeof doc?.maxBookingDays === 'number' && Number.isFinite(doc.maxBookingDays)
        ? Math.min(Math.max(Math.round(doc.maxBookingDays), 1), 365)
        : DEFAULT_SYSTEM_SETTINGS.maxBookingDays,
    maintenanceMode: doc?.maintenanceMode === true,
    autoApproveSpaces: doc?.autoApproveSpaces === true,
    updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt : new Date(0),
    updatedBy: doc?.updatedBy instanceof ObjectId ? doc.updatedBy : null,
  };
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const db = await getDb();
    const doc = await db.collection<SystemSettingsDoc>(COLLECTION).findOne({ key: SETTINGS_KEY });
    return coerce(doc);
  } catch {
    // Allow the UI to render when MongoDB/Atlas is unreachable.
    return coerce(null);
  }
}

export async function updateSystemSettings(
  patch: Partial<Pick<SystemSettings, 'siteName' | 'maxBookingDays' | 'maintenanceMode' | 'autoApproveSpaces'>>,
  adminId: ObjectId,
): Promise<SystemSettings> {
  const db = await getDb();
  const now = new Date();
  const update: Partial<SystemSettingsDoc> = {};

  if (patch.siteName !== undefined) {
    update.siteName = patch.siteName.trim().slice(0, 100) || DEFAULT_SYSTEM_SETTINGS.siteName;
  }
  if (patch.maxBookingDays !== undefined) {
    update.maxBookingDays = Math.min(Math.max(Math.round(patch.maxBookingDays), 1), 365);
  }
  if (patch.maintenanceMode !== undefined) {
    update.maintenanceMode = patch.maintenanceMode;
  }
  if (patch.autoApproveSpaces !== undefined) {
    update.autoApproveSpaces = patch.autoApproveSpaces;
  }

  update.updatedAt = now;
  update.updatedBy = adminId;

  await db.collection<SystemSettingsDoc>(COLLECTION).updateOne(
    { key: SETTINGS_KEY },
    {
      $set: update,
      $setOnInsert: {
        key: SETTINGS_KEY,
        ...DEFAULT_SYSTEM_SETTINGS,
        updatedAt: now,
        updatedBy: adminId,
      },
    },
    { upsert: true },
  );

  return getSystemSettings();
}
