import { NextResponse } from 'next/server';

const IP = '103.162.16.14';
const PORT = 4370;
const TIMEOUT = 10000;
const IN_PORT = 4000;

export async function executeZKCommand<T>(command: (zk: any) => Promise<T>): Promise<T> {
  let zkInstance: any = null;
  
  try {
    // Dynamic import to avoid build-time issues with zkteco-js
    const ZKLib = require('zkteco-js');
    
    zkInstance = new ZKLib(IP, PORT, TIMEOUT, IN_PORT);
    
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
