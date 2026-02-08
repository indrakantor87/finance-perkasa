import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_IP = '103.162.16.14';
const DEFAULT_PORT = 4370;
const TIMEOUT = 20000; // Increased timeout
const IN_PORT = 4000;

export async function executeZKCommand<T>(command: (zk: any) => Promise<T>): Promise<T> {
  let zkInstance: any = null;
  
  try {
    // Get machine config from DB
    const settings = await prisma.systemSetting.findFirst();
    const ip = settings?.machineIp || DEFAULT_IP;
    const port = settings?.machinePort || DEFAULT_PORT;

    // Dynamic import to avoid build-time issues with zkteco-js
    const ZKLib = require('zkteco-js');
    
    zkInstance = new ZKLib(ip, port, TIMEOUT, IN_PORT);
    
    // Create socket
    try {
        await zkInstance.createSocket();
    } catch (err) {
        console.error('[ZK] Create Socket Failed:', err);
        throw new Error('Failed to create socket: ' + err);
    }
    
    // Execute the command
    const result = await command(zkInstance);
    return result;
    
  } catch (error: any) {
    console.error('[ZK] Operation Error:', error);
    throw error;
  } finally {
      if (zkInstance) {
          try {
              await zkInstance.disconnect();
          } catch (e) {
              console.error('[ZK] Disconnect error:', e);
          }
      }
  }
}

export type ZKUser = {
    uid: number;
    role: number;
    password?: string;
    name: string;
    cardno?: string;
    userId: string;
};
