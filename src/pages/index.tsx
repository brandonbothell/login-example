import { signIn, signOut, useSession } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import Terminal from '~/components/Terminal'
import { api } from '~/utils/api'

export default function Home() {
  const hello = api.example.hello.useQuery({ text: 'a reminder to sign in.' })

  return (
    <>
      <Head>
        <title>Brandon&apos;s Bench</title>
        <meta name="description" content="Brandon Bothell's public resume and personal development space, which contains links to his GitHub, specific coding projects, a terminal minigame and sign-in functionality." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Brandon&apos;s
            {' '}
            <span className="text-[hsl(280,100%,70%)]">Bench</span>
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
              href="https://github.com/brandonbothell"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">GitHub →</h3>
              <div className="text-lg">
                Check out my GitHub - you can find everything
                I&apos;ve ever publicly made here, including this
                very program, for free.
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
              href="https://popyt.brandonsbench.net"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">Popyt →</h3>
              <div className="text-lg">
                Use Popyt for accessing data from the YouTube Data v3 API.
                It&apos;s fast, simple, and has caching & pagination.
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
              href="https://github.com/brandonbothell/gander"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">Gander →</h3>
              <div className="text-lg">
                A home security camera application built for self-hosting
                and easy code customization. Multiple camera feeds accessible through a
                secured web interface.
              </div>
            </Link>
          </div>
          <div className="flex flex-col items-center gap-2">
            {hello.data && (
              <p className="text-2xl text-white">
                {hello.data.message}
              </p>
            )}
            <AuthShowcase />
          </div>
        </div>
      </main>
      <Terminal />
    </>
  )
}

function AuthShowcase() {
  const session = useSession()

  const { data: secretData } = api.example.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: session.data?.user !== undefined },
  )

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {session.status !== 'unauthenticated' && (
          <span>
            Logged in as
            {' '}
            {session.status === 'authenticated' && session.data.user.image
              && (
                <Image
                  className="rounded-full inline profile-pic ring-2"
                  src={session.data.user.image}
                  width={30}
                  height={30}
                  alt="Profile picture"
                />
              )}
            {session.status === 'loading' ? 'Loading...' : session.data!.user.name}
          </span>
        )}
        <span>
          {' '}
          {session.status !== 'unauthenticated' && '-'}
          {' '}
          {session.status !== 'unauthenticated' && (secretData ? secretData.message : 'Loading secret message...')}
        </span>
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={session.data ? () => void signOut() : () => void signIn()}
      >
        {session.data ? 'Sign out' : 'Sign in'}
      </button>

      {session.data && (
        <Link href="/auth/linkaccount">
          <button
            className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
          >
            Link account
          </button>
        </Link>
      )}
    </div>
  )
}
