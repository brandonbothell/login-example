import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { type GetServerSidePropsContext } from 'next'
import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
  type Account,
  type User,
} from 'next-auth'
import GoogleProvider, { type GoogleProfile } from 'next-auth/providers/google'
import DiscordProvider, { type DiscordProfile } from 'next-auth/providers/discord'
import GitHubProvider from 'next-auth/providers/github'
import { env } from '~/env.mjs'
import { prisma } from '~/server/db'
import type { Account as DBAccount, User as DBUser } from '~/@prisma/client'
import type { OAuthProviderButtonStyles } from 'next-auth/providers/oauth'

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      id: string
      // ...other properties
      // role: UserRole;
    }
    error?: string
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
  req: GetServerSidePropsContext['req']
  res: GetServerSidePropsContext['res']
}): NextAuthOptions => {
  const options: NextAuthOptions = {
    callbacks: {
      session: async ({ session, user }) => {
        const googleAccount = await prisma.account.findFirst({
          where: { userId: user.id, provider: 'google' },
        })
        if (googleAccount && googleAccount.refresh_token && googleAccount.expires_at! * 1000 < Date.now()) {
        // If the access token has expired, try to refresh it
          try {
            // https://accounts.google.com/.well-known/openid-configuration
            // We need the `token_endpoint`.
            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              body: new URLSearchParams({
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret: env.GOOGLE_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: googleAccount?.refresh_token,
              }),
            })

            const tokensOrError = await response.json()

            if (!response.ok) throw tokensOrError

            const newTokens = tokensOrError as {
              access_token: string
              expires_in: number
              refresh_token?: string
            }

            await prisma.account.update({
              data: {
                access_token: newTokens.access_token,
                expires_at: Math.floor(Date.now() / 1000 + newTokens.expires_in),
                refresh_token:
                newTokens.refresh_token ?? googleAccount.refresh_token,
              },
              where: {
                provider_providerAccountId: {
                  provider: 'google',
                  providerAccountId: googleAccount.providerAccountId,
                },
              },
            })
          }
          catch (error) {
            console.error('Error refreshing access_token', error)
            // If we fail to refresh the token, return an error so we can handle it on the page
            session.error = 'RefreshTokenError'
          }
        }

        return ({
          ...session,
          user: {
            ...session.user,
            id: user.id,
          },
        })
      },
      signIn: async ({ user, profile, account }) => {
        const existingUser = await prisma.user.findUnique({ where: { email: profile?.email } })
        const existingAccount = await prisma.account.findFirst({
          where: {
            provider: account?.provider,
            providerAccountId: account?.providerAccountId,
          },
        })

        // Disallow sign up with another user's account
        if (existingAccount
          && existingAccount.userId !== user.id) {
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
              return verifyEmail(account, user, existingAccount, existingUser)

            case 'discord':
              if (!checkedProvider && (profile as DiscordProfile).verified) {
                return verifyEmail(account, user, existingAccount, existingUser)
              }
              checkedProvider = true
              // Continue if unverified

            case 'google':
              if (!checkedProvider && (profile as GoogleProfile).email_verified) {
                return verifyEmail(account, user, existingAccount, existingUser)
              }
              checkedProvider = true
              // Continue if unverified

            default:
              // Disallow sign in with an unverified email
              return `/auth/linkaccount?error=${checkedProvider
                ? encodeURIComponent('That account has an unverified email address.\nTry using a Google or GitHub account to sign in.')
                : encodeURIComponent('The email address of that account couldn\'t be verified.\nPlease try using another service to sign in before linking this account.')}`
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
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Improper typings
    adapter: PrismaAdapter(prisma),
    providers: [
      GoogleProvider({
        authorization: { params: { access_type: 'offline', prompt: 'consent' } },
        token: 'https://oauth2.googleapis.com/token',
        profile: async (profile, tokens) => {
          if (tokens.refresh_token) {
            const googleAccount = await prisma.account.findFirst({
              where: { user: { email: profile.email }, provider: 'google' },
            })

            if (googleAccount) {
              await prisma.account.update({
                data: {
                  refresh_token: tokens.refresh_token,
                },
                where: {
                  provider_providerAccountId: {
                    provider: 'google',
                    providerAccountId: googleAccount.providerAccountId,
                  },
                },
              })
            }
          }

          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
          }
        },
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
      GitHubProvider({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        style: { logo: '/github.svg', logoDark: '/github.svg' } as OAuthProviderButtonStyles,
      }),
      DiscordProvider({
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        style: { logo: '/discord.svg', logoDark: '/discord.svg' } as OAuthProviderButtonStyles,
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
}

async function verifyEmail(
  account: Account, user: User,
  existingAccount: DBAccount | null, existingUser: DBUser | null) {
  if (existingUser && !existingUser.emailVerified) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: { emailVerified: new Date() },
    }).then(() => true).catch(() => false)
  }
  else if (!existingUser && !existingAccount) {
    const newUser = await prisma.user.create({
      data: { ...user, emailVerified: new Date(), id: undefined },
    })

    return prisma.account
      .create({ data: { ...account, userId: newUser.id } })
      .then(() => true).catch(() => false)
  }
  else if (existingUser?.emailVerified) {
    return true
  }
  else {
    return false
  }
}

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext['req']
  res: GetServerSidePropsContext['res']
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions(ctx))
}
