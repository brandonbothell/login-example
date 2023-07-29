import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
  type Account,
  type User,
} from "next-auth";
import GoogleProvider, { type GoogleProfile } from 'next-auth/providers/google'
import DiscordProvider, { type DiscordProfile } from 'next-auth/providers/discord'
import GitHubProvider from 'next-auth/providers/github'
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import { type Account as DBAccount, type User as DBUser } from "~/__generated__/prisma";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      // ...other properties
      // role: UserRole;
    };
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}): NextAuthOptions => {
  const options: NextAuthOptions = {
    callbacks: {
      session: ({ session, user }) => ({
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      }),
      signIn: async ({ user, profile, account }) => {
        const existingUser = await prisma.user.findUnique({ where: { email: profile?.email } })
        const existingAccount = await prisma.account.findFirst({
          where: {
            provider: account?.provider,
            providerAccountId: account?.providerAccountId
          }
        })

        // Disallow sign up with another user's account
        if (existingAccount &&
          existingAccount.userId !== user.id) {
          console.log('broken')
          return false
        }

        const session = await getServerSession(ctx.req, ctx.res, options)

        if (!session) {
          // We are not logged in
          // If the email is verified, we can allow sign in/account creation
          let checkedProvider = false

          switch (account?.provider) {
            case 'github':
              // GitHub OAuth emails are always verified
              checkedProvider = true
              return verifyEmail(account, user, existingAccount, existingUser)

            case 'discord':
              if (!checkedProvider && (profile as DiscordProfile).verified) {
                return verifyEmail(account, user, existingAccount, existingUser)
              } checkedProvider = true

            case 'google':
              if (!checkedProvider && (profile as GoogleProfile).email_verified) {
                return verifyEmail(account, user, existingAccount, existingUser)
              } checkedProvider = true

            default:
              // Disallow sign in with an unverified email
              return `/auth/linkaccount?error=${checkedProvider ?
                encodeURIComponent('That account has an unverified email address.\nTry using a Google or GitHub account to sign in.') :
                encodeURIComponent('The email address of that account couldn\'t be verified.\nPlease try using another service to sign in.')}`
          }
        }

        // We are already logged in
        // Allow linking of accounts that aren't used by others regardless of email
        if (!existingAccount) {
          return true
        }

        // Disallow linking of accounts already linked to a user
        return `/auth/linkaccount?error=${encodeURIComponent('That account has already been linked to another user.\nIf you believe this is a mistake, contact us.')
          }`
      }
    },
    adapter: PrismaAdapter(prisma),
    providers: [
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
      GitHubProvider({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      }),
      DiscordProvider({
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
      }),
      /**
       * ...add more providers here.
       *
       * Most other providers require a bit more work than the Discord provider. For example, the
       * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
       * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
       *
       * @see https://next-auth.js.org/providers/github
       */
    ],
  }

  return options
};

async function verifyEmail(
  account: Account, user: User,
  existingAccount: DBAccount | null, existingUser: DBUser | null) {
  if (existingUser && !existingUser.emailVerified) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: { emailVerified: new Date() }
    }).then(() => true).catch(() => false)
  } else if (!existingUser && !existingAccount) {
    const newUser = await prisma.user.create({
      data: { ...user, emailVerified: new Date(), id: undefined }
    })

    return prisma.account
      .create({ data: { ...account, userId: newUser.id } })
      .then(() => true).catch(() => false)
  } else if (existingUser?.emailVerified) {
    return true
  } else {
    return false
  }
}

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions(ctx));
};
