import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createNotification(
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  category: 'system' | 'data_input' | 'import' | 'employee' | 'salary' = 'system'
) {
  try {
    await prisma.notification.create({
      data: {
        title,
        message,
        type,
        category,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
