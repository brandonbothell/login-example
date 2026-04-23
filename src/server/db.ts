import { PrismaClient } from '~/@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '~/env.mjs'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const adapter = new PrismaPg(env.POSTGRES_PRISMA_URL)
export const prisma
  = globalForPrisma.prisma
    ?? new PrismaClient({
      adapter,
      log:
      env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
