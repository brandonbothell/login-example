import { useEffect, useRef, useState } from 'react'

type TerminalLine = { userInput?: boolean, error?: boolean, value: string }

export default function Terminal() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<TerminalLine[]>([
    { userInput: false, value: 'Welcome to Brandon\'s Bench Terminal!' },
    { userInput: false, value: 'Type \'help\' for available commands.' }])
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
  const commands = useRef<{ [command: string]: TerminalLine | ((flags: string[], ...args: string[]) => TerminalLine) }>({
    help: {
      value: `Available commands:
┌─────────────────────────────────────────────┐
│ help    │  github  │  whoami                │
│ ────────┼──────────┼────────────────────────│
│ about   │  popyt   │  date [-e] [today|now] │
│ ────────┼──────────┼────────────────────────│
│ clear   │  gander  │  ls                    │
└─────────────────────────────────────────────┘
`,
    },
    about: {
      value: 'Brandon\'s Bench - A public resume and personal development space. Check out my projects and try the \'whoami\' command!',
    },
    github: {
      value: 'Opening GitHub... (https://github.com/brandonbothell)',
    },
    popyt: {
      value: 'Popyt - Fast YouTube Data API access with caching & pagination. (https://popyt.brandonsbench.net)',
    },
    gander: {
      value: 'Gander - Self-hosted home security camera application. (https://github.com/brandonbothell/gander)',
    },
    clear: {
      value: 'clear', // specially handled
    },
    whoami: {
      value: 'You are a potential collaborator, employer, or fellow developer checking out my personal portfolio site. Feel free to reach out to me via brandon@brandonsbench.net or through the contact information listed here!',
    },
    rm: (flags: string[], ...args: string[]): TerminalLine => {
      const toDelete = args.length ? args[0] : void 0
      return { value: `Nice try! But you can't delete my website that easily. 😉
${toDelete ? `(attempted deleting '${toDelete}')` : ''}` }
    },
    ls: {
      value: 'readme.txt  terminal.tsx  linkaccount.tsx  globals.css',
    },
    cat: (flags: string[], ...args: string[]): TerminalLine => {
      if (!args.length) {
        return { error: true, value: 'Usage: \'cat <filename>\'\nList files with \'ls\'' }
      }

      const filename = args[0]!

      if (!['readme.txt', 'terminal.tsx', 'linkaccount.tsx', 'globals.css'].includes(filename)) {
        return { error: true, value: `File '${filename}' not found\nList files with 'ls'` }
      }

      return { value: 'Placeholder' }
    },
    echo: (flags: string[], ...args: string[]): TerminalLine => {
      return { value: args.join(' ') }
    },
    date: (flags: string[], ...args: string[]): TerminalLine => {
      const epochMode = flags.findIndex(flag => flag === '-e' || flag.toLowerCase() === '--epoch') !== -1
      if (args.length > 0) {
        if (args[0]!.toLowerCase() === 'today') {
          return { value: epochMode ? new Number(Math.floor(new Date(new Date().toDateString()).getTime() / 1000)).toString(10) : new Date().toDateString() }
        }
        else if (args[0]!.toLowerCase() === 'now') {
          return { value: epochMode ? new Number(Math.floor(new Date().getTime() / 1000)).toString(10) : new Date().toString() }
        }
        else {
          return { error: true, value: `Unknown argument for date command: ${args[0]}. Use 'date today' or 'date now'.` }
        }
      }

      return { value: epochMode ? new Number(Math.floor(new Date().getTime() / 1000)).toString(10) : new Date().toString() }
    },
    fortune: {
      value: 'You will find great success in your coding endeavors. Keep building amazing things!',
    },
    matrix: {
      value: 'Wake up, Neo... The Matrix has you...',
    },
    42: {
      value: 'The answer to life, the universe, and everything.',
    },
  })

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
      const flags: string[] = []
      const args = split.slice(1).filter((arg) => {
        if (arg.startsWith('-')) {
          flags.push(arg)
          return false
        }

        return true
      })
      const newHistory = [...history, { userInput: true, value: `$ ${input}` }]

      if (baseCommand === 'clear') {
        newHistory.length = 0
      }
      else if (commands.current[baseCommand as keyof typeof commands.current]) {
        const response = commands.current[baseCommand as keyof typeof commands.current]
        if (typeof response === 'object') {
          newHistory.push(...response.value.split('\n').map(line => ({ ...response, value: line })))
        }
        else if (typeof response === 'function') {
          const output = response(flags, ...args)
          newHistory.push(...output.value.split('\n').map(line => ({ ...output, value: line })))
        }
        else {
          throw new Error('Invalid command response type')
        }
      }
      else {
        newHistory.push({ error: true, value: `Command not found: '${baseCommand}'. Type 'help' for available commands.` })
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

  const renderLineWithLinks = (line: TerminalLine, index: number) => {
    let i = index
    const urlRegex = /(https?:\/\/[a-zA-Z0-9./&%?=]+)/g
    const parts = line.value.split(urlRegex)

    return parts.map((part) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={i++}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            {part}
          </a>
        )
      }

      return renderLineWithEmailLinks({ ...line, value: part }, i++)
    })
  }

  const renderLineWithEmailLinks = (line: TerminalLine, index: number) => {
    let i = index
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    if (!emailRegex.test(line.value)) return <span key={index} style={{ color: line.error ? '#971e1e' : line.userInput ? '#ffffff' : 'unset' }}>{line.value}</span>
    const parts = line.value.split(emailRegex)

    return parts.map((part) => {
      if (emailRegex.test(part)) {
        return (
          <a
            onClick={(e) => {
              window.open(`mailto:${part}`, 'mail')
              e.preventDefault()
            }}
            key={i++}
            href={`mailto:${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer inline-block"
          >
            {part}
          </a>
        )
      }
      return <span key={i++} color={line.error ? 'red' : 'unset'}>{part}</span>
    })
  }

  const renderLineWithTables = (line: TerminalLine, index: number) => {
    const i = index
    console.log('Line: ' + line)
    if (line.value[0] === undefined) return renderLineWithLinks(line, index)
    const lineIsTable = ['┌', '│', '└'].includes(line.value[0])

    if (!lineIsTable) return renderLineWithLinks(line, index)

    return (
      <div
        style={{ lineHeight: '86%' }}
        key={i}
      >
        {line.value}
      </div>
    )
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
      className="fixed w-100 h-64 bg-black border border-gray-600 rounded-lg shadow-lg overflow-hidden z-50 "
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
      <div style={{ whiteSpace: 'pre-wrap' }} className="p-2 h-full overflow-y-auto bg-black text-green-400 font-mono text-sm" ref={scrollContainerRef} onClick={handleClick}>
        <br />
        {history.map((line, index) => (
          <div key={index} className="mb-1 cursor-text" onClick={e => e.stopPropagation()}>
            {renderLineWithTables(line, index)}
          </div>
        ))}
        <div className="flex" onClick={e => e.stopPropagation()}>
          <span className="text-white">$ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm"
            autoComplete="off"
            spellCheck="false"
          />
          {isFocused && <span className="text-green-400 animate-pulse">|</span>}
        </div>
      </div>
    </div>
  )
}
