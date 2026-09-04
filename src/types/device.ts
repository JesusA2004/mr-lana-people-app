export type DevicePlatform = 'ios' | 'android' | 'web';

export interface RegisterPushTokenPayload {
  token: string;
  platform: DevicePlatform;
  device_name?: string;
}
