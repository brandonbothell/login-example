import { signIn, signOut, useSession } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { api } from '~/utils/api'

const commands = {
  'help': 'Available commands: help, about, github, popyt, gander, clear, whoami',
  'about': 'Brandon\'s Bench - A public resume and personal development space. Check out my projects and try the \'whoami\' command!',
  'github': 'Opening GitHub... (https://github.com/brandonbothell)',
  'popyt': 'Popyt - Fast YouTube Data API access with caching & pagination. (https://popyt.brandonsbench.net)',
  'gander': 'Gander - Self-hosted home security camera application. (https://github.com/brandonbothell/gander)',
  'clear': 'clear',
  'whoami': 'You are a potential collaborator, employer, or fellow developer checking out my personal portfolio site. Feel free to reach out to me via brandon@brandonsbench.net or through the contact information listed here!',
  'sudo rm -rf /': 'Nice try! But you can\'t delete the internet. 😉',
  'ls': 'index.tsx  _app.tsx  api/  auth/  components/  server/  styles/  utils/',
  'cat README.md': 'Brandon\'s Bench - Personal portfolio and development space. Built with Next.js, tRPC, and NextAuth.',
  'echo hello': 'hello',
  'date': (...args: string[]) => {
    if (args.length > 0) {
      if (args[0]!.toLowerCase() === 'today') {
        return new Date().toDateString()
      }
      else if (args[0]!.toLowerCase() === 'now') {
        return new Date().toString()
      }
      else {
        return `Unknown argument for date command: ${args[0]}. Use 'date today' or 'date now'.`
      }
    }

    return new Date().toString()
  },
  'fortune': 'You will find great success in your coding endeavors. Keep building amazing things!',
  'matrix': 'Wake up, Neo... The Matrix has you...',
  '42': 'The answer to life, the universe, and everything.',
}

export default function Home() {
  const hello = api.example.hello.useQuery({ text: 'from tRPC' })

  return (
    <>
      <Head>
        <title>Brandon&apos;s Bench</title>
        <meta name="description" content="Brandon Bothell's public resume and personal development space, which contains links to his GitHub, specific coding projects, a terminal minigame and sign-in functionality." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
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
            <p className="text-2xl text-white">
              {hello.data ? hello.data.greeting : 'Loading tRPC query...'}
            </p>
            <AuthShowcase />
          </div>
        </div>
      </main>
      <Terminal />
    </>
  )
}

function Terminal() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>(['Welcome to Brandon\'s Bench Terminal!',
    'Type \'help\' for available commands.'])
  const [isFocused, setIsFocused] = useState(false)
  const [mouseOverClose, setMouseOverClose] = useState(false)
  const [mouseDownClose, setMouseDownClose] = useState(false)
  const [closed, setClosed] = useState(false)
  const closeButtonRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ bottom: 16, right: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const [windowSize, setWindowSize] = useState({
    width: 1024,
    height: 768,
  })
  const isSmallScreen = windowSize.width < 640

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // Set initial size on mount
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = input.trim()
      const split = trimmed.split(' ')
      const baseCommand = split[0]?.toLowerCase()
      const args = split.slice(1)
      const newHistory = [...history, `$ ${input}`]

      if (baseCommand === 'clear') {
        newHistory.length = 0
      }
      else if (commands[baseCommand as keyof typeof commands]) {
        const response = commands[baseCommand as keyof typeof commands]
        if (typeof response === 'string') {
          newHistory.push(response)
        }
        else if (typeof response === 'function') {
          newHistory.push(response(...args))
        }
        else {
          throw new Error('Invalid command response type')
          newHistory.push(response.toString())
        }
      }
      else {
        newHistory.push(`Command not found: '${baseCommand}'. Type 'help' for available commands.`)
      }

      setHistory(newHistory)
      setInput('')
    }
  }

  const handleClick = () => {
    inputRef.current?.focus()
    setIsFocused(true)
  }

  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    if (terminalRef.current) {
      const rect = terminalRef.current.getBoundingClientRect()
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleTitleBarTouchStart = (e: React.TouchEvent) => {
    if (terminalRef.current && e.touches.length > 0) {
      const rect = terminalRef.current.getBoundingClientRect()
      setIsDragging(true)
      setDragOffset({
        x: e.touches[0]!.clientX - rect.left,
        y: e.touches[0]!.clientY - rect.top,
      })
    }
  }

  const handleCloseTouchStart = () => {
    setMouseOverClose(true)
    setMouseDownClose(true)
  }

  const handleCloseTouchEnd = (e: React.TouchEvent) => {
    if (mouseDownClose && mouseOverClose && closeButtonRef.current) {
      const touch = e.changedTouches[e.changedTouches.length - 1]!
      const rect = closeButtonRef.current.getBoundingClientRect()

      if (touch.pageX >= rect.left - 2 && touch.pageX <= rect.left + 10) {
        if (touch.pageY >= rect.top - 2 && touch.pageY <= rect.top + 10) {
          setHistory([])
          setClosed(true)
        }
      }
    }

    setMouseDownClose(false)
    setMouseOverClose(false)
  }

  const renderLineWithLinks = (line: string) => {
    const urlRegex = /(https?:\/\/[a-zA-Z0-9./&%?=]+)/g
    const parts = line.split(urlRegex)

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            {part}
          </a>
        )
      }

      return part
    })
  }

  const renderLineWithEmailLinks = (line: string) => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    const parts = line.split(emailRegex)

    return parts.map((part, index) => {
      if (emailRegex.test(part)) {
        return (
          <a
            onClick={(e) => {
              window.open(`mailto:${part}`, 'mail')
              e.preventDefault()
            }}
            key={index}
            href={`mailto:${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('click', handleGlobalClick)
    return () => document.removeEventListener('click', handleGlobalClick)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !terminalRef.current) return

      const newLeft = e.clientX - dragOffset.x
      const newTop = e.clientY - dragOffset.y
      const newRight = window.innerWidth - newLeft - terminalRef.current.offsetWidth
      const newBottom = window.innerHeight - newTop - terminalRef.current.offsetHeight

      setPosition({
        bottom: Math.min(Math.max(0, newBottom), window.innerHeight - terminalRef.current.offsetHeight),
        right: Math.min(Math.max(0, newRight), window.innerWidth - terminalRef.current.offsetWidth),
      })
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !terminalRef.current || e.touches.length === 0) return

      const newLeft = e.touches[0]!.clientX - dragOffset.x
      const newTop = e.touches[0]!.clientY - dragOffset.y
      const newRight = window.innerWidth - newLeft - terminalRef.current.offsetWidth
      const newBottom = window.innerHeight - newTop - terminalRef.current.offsetHeight

      setPosition({
        bottom: Math.min(Math.max(0, newBottom), window.innerHeight - terminalRef.current.offsetHeight),
        right: Math.min(Math.max(0, newRight), window.innerWidth - terminalRef.current.offsetWidth),
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [history, input])

  return (
    <div
      ref={terminalRef}
      className="fixed w-96 h-64 bg-black border border-gray-600 rounded-lg shadow-lg overflow-hidden z-50 "
      style={{ display: (closed || isSmallScreen) ? 'none' : 'block', right: `${position.right}px`, cursor: isDragging ? 'grabbing' : 'default', touchAction: 'none', bottom: `${position.bottom}px` }}
    >
      <div className="bg-gray-800 px-2 py-1 text-xs text-gray-300 flex items-center absolute top-0 left-0 w-full select-none" style={{ cursor: mouseOverClose ? 'pointer' : 'default' }}>
        <div className="flex space-x-1">
          <div
            ref={closeButtonRef}
            className="w-3 h-3 bg-red-500 rounded-full flex justify-center items-center"
            onMouseEnter={() => {
              setMouseOverClose(true)
              document.body.style.cursor = 'pointer'
            }}
            onMouseLeave={() => {
              setMouseOverClose(false)
              document.body.style.cursor = 'default'
            }}
            onMouseDown={() => setMouseDownClose(true)}
            onTouchStart={handleCloseTouchStart}
            onMouseUp={() => {
              if (mouseDownClose && mouseOverClose) {
                setHistory([])
                setClosed(true)
              }
              setMouseDownClose(false)
            }}
            onTouchEnd={handleCloseTouchEnd}
          >
            {mouseOverClose
              && (
                <span
                  className="text-center select-none text-black"
                  style={{
                    fontSize: '7pt',
                    paddingRight: '1px',
                    paddingBottom: '1px',
                    fontWeight: '1000',
                  }}
                >
                  ☓
                </span>
              )}
          </div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="w-full" onMouseDown={handleTitleBarMouseDown} onTouchStart={handleTitleBarTouchStart} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
          <span className="ml-2 select-none">Terminal</span>
        </div>
      </div>
      <div className="p-2 h-full overflow-y-auto bg-black text-green-400 font-mono text-sm" ref={scrollContainerRef} onClick={handleClick}>
        <br />
        {history.map((line, index) => (
          <div key={index} className="mb-1 cursor-text" onClick={e => e.stopPropagation()}>
            {renderLineWithLinks(line).map((line) => {
              return typeof line === 'string' ? renderLineWithEmailLinks(line) : line
            })}
          </div>
        ))}
        <div className="flex" onClick={e => e.stopPropagation()}>
          <span className="text-green-400">$ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono text-sm pl-1.5"
            autoComplete="off"
            spellCheck="false"
          />
          {isFocused && <span className="text-green-400 animate-pulse">|</span>}
        </div>
      </div>
    </div>
  )
}

function AuthShowcase() {
  const { data: sessionData } = useSession()

  const { data: secretMessage } = api.example.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: sessionData?.user !== undefined },
  )

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && (
          <span>
            Logged in as
            {sessionData.user?.image
              && (
                <Image
                  className="rounded-full inline profile-pic ring-2"
                  src={sessionData.user?.image}
                  width={30}
                  height={30}
                  alt="Profile picture"
                />
              )}
            {sessionData.user?.name}
          </span>
        )}
        {secretMessage && (
          <span>
            {' '}
            -
            {secretMessage}
          </span>
        )}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? 'Sign out' : 'Sign in'}
      </button>

      {sessionData && (
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
