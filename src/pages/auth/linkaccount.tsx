import { signIn, getProviders, getCsrfToken } from 'next-auth/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { type InferGetServerSidePropsType, type GetServerSidePropsContext } from 'next/types'
import { useState } from 'react'
import { SocialIcon } from 'react-social-icons'
import { getServerAuthSession } from '~/server/auth'
import { prisma } from '~/server/db'

const LinkAccount = ({ csrfToken, providers, alreadyLinkedProviders }:
  InferGetServerSidePropsType<typeof getServerSideProps>) => {

  const availableProviders = providers ? Object.values(providers)
    .filter(provider => !alreadyLinkedProviders.includes(provider.id))
    .map(provider => (
      <div key={provider.id}>
        <button className="flex items-center rounded-xl bg-white/20 px-5 py-3 my-2 font-semibold text-white no-underline transition hover:bg-white/30"
          onClick={() => void signIn(provider.id, {
            callbackUrl: `/auth/linkaccount?message=${encodeURIComponent(`Your ${provider.name} account has been successfully linked.`)}`
          })}>
          <div><SocialIcon network={provider.id} className="mr-2"
            style={{ height: 30, width: 30 }} /></div>
          Link with {provider.name}</button>
      </div>
    )) : []

  const params = useSearchParams()
  const [error, setError] = useState(params.get('error')?.split('\n'))
  const [message, setMessage] = useState(params.get('message')?.split('\n'))

  return (
    <main className="flex min-h-screen flex-col sm:flex-row items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
      {/* Left column container with background */}
      <div
        className="mb-12 sm:mb-6 mr-0 w-3/5 h-3/5 sm:w-2/5 sm:h-2/5 inline-flex justify-center">
        <img
          src="https://tecdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.webp"
          className="w-3/4"
          alt="Login image" />
      </div>

      {/* Right column container */}
      <div className="w-2/3 sm:w-2/5 flex flex-col items-center">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 my-4 rounded relative" role="alert">
          <strong className="font-bold">Error</strong>
          <span className="block">{error.join(' ')}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
              onClick={() => setError(undefined)}><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" /></svg>
          </span>
        </div>
        }
        {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 my-4 rounded relative" role="alert">
          <strong className="font-bold">Success</strong>
          <span className="block">{message.map(line => (
            <>{line} </>
          ))}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
            <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
              onClick={() => setMessage(undefined)}><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" /></svg>
          </span>
        </div>
        }

        <input name='csrfToken' type='hidden' defaultValue={csrfToken} />
        {availableProviders.length ?
          availableProviders.map(provider => provider) :
          <p className="text-2xl text-white mb-2 text-center">
            You&apos;ve linked all the accounts. Nice job!
          </p>}

        <Link href="/"><button className="rounded-full bg-white/10 px-10 py-3 my-2 font-semibold text-white no-underline transition hover:bg-white/20">
          Go back</button></Link>
      </div>
    </main>
  )

}

export default LinkAccount

export async function getServerSideProps(ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) {
  const session = await getServerAuthSession(ctx);

  // If the user isn't already logged in, redirect.
  // Note: Make sure not to redirect to the same page
  // To avoid an infinite loop!
  if (!session) {
    return { redirect: { destination: "/" } };
  }

  const providers = await getProviders()
  const csrfToken = await getCsrfToken(ctx)
  const alreadyLinkedProviders = await prisma.account
    .findMany({ where: { userId: session.user.id } })
    .then(accounts => accounts.map(account => account.provider))

  return {
    props: {
      providers,
      csrfToken,
      alreadyLinkedProviders: alreadyLinkedProviders ?? []
    },
  }
}
