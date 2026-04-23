import { z } from 'zod'
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from '~/server/api/trpc'

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input, ctx: { session } }) => {
      if (session) return null
      return {
        message: `This is ${input.text}`,
      }
    }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.example.findMany()
  }),

  getSecretMessage: protectedProcedure.query(({ ctx: { session } }) => {
    return { message: `This is a secret message for ${session.user.name!.split(' ')[0]}!` }
  }),
})
