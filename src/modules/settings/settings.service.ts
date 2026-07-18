import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting } from './schemas/setting.schema';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cache: Record<string, any> = {};

  constructor(@InjectModel(Setting.name) private readonly settingModel: Model<Setting>) {}

  async onModuleInit() {
    await this.refreshCache();
    await this.seedDefaults();
  }

  private async refreshCache() {
    const settings = await this.settingModel.find().exec();
    this.cache = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, any>);
  }

  private async seedDefaults() {
    const defaults = [
      { key: 'hospitalName', value: 'MediTrust Enterprise Hospital', description: 'Name printed on receipts', isPublic: true },
      { key: 'enableSmsNotifications', value: true, description: 'Toggle SMS globally', isPublic: false },
      { key: 'enableWhatsappNotifications', value: true, description: 'Toggle WhatsApp globally', isPublic: false },
      { key: 'defaultCurrency', value: 'NGN', description: 'System default currency', isPublic: true },
    ];

    for (const def of defaults) {
      if (this.cache[def.key] === undefined) {
        await this.settingModel.create(def);
        this.cache[def.key] = def.value;
        this.logger.log(`Seeded default setting: ${def.key}`);
      }
    }
  }

  async getAllSettings(includePrivate: boolean = false): Promise<Record<string, any>> {
    const settings = await this.settingModel.find(includePrivate ? {} : { isPublic: true }).exec();
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, any>);
  }

  async getSetting<T>(key: string, defaultValue?: T): Promise<T> {
    if (this.cache[key] !== undefined) {
      return this.cache[key] as T;
    }
    const setting = await this.settingModel.findOne({ key }).exec();
    if (setting) {
      this.cache[key] = setting.value;
      return setting.value as T;
    }
    return defaultValue as T;
  }

  async updateSetting(key: string, value: any): Promise<Setting> {
    const setting = await this.settingModel.findOneAndUpdate(
      { key },
      { value },
      { returnDocument: 'after', upsert: true }
    ).exec();
    
    this.cache[key] = value;
    this.logger.log(`Setting updated: ${key}`);
    return setting;
  }
}
