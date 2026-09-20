import React, { useMemo } from 'react'
import { marked, Tokens } from 'marked'
import { CodeBlock } from './CodeBlock'
import { Check } from 'lucide-react'

interface MarkdownRendererProps {
  content: string | null | undefined
  className?: string
  onImageClick?: (src: string, alt?: string) => void
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  onImageClick
}) => {
  const tokens = useMemo(() => {
    if (!content) return []
    try {
      return marked.lexer(content)
    } catch (e) {
      console.warn('Failed to parse markdown:', e)
      return []
    }
  }, [content])

  if (!content) {
    return <p className="text-slate-500 italic text-xs">No content provided.</p>
  }

  // Render inline HTML safely
  const renderInline = (rawText: string) => {
    try {
      const parsed = marked.parseInline(rawText) as string
      return <span dangerouslySetInnerHTML={{ __html: parsed }} />
    } catch {
      return <span>{rawText}</span>
    }
  }

  const renderToken = (token: Tokens.Generic, index: number) => {
    switch (token.type) {
      case 'heading': {
        const text = token.text
        if (token.depth === 1) {
          return (
            <h1
              key={index}
              className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1.5 border-b border-slate-200 dark:border-[#23272F]"
            >
              {renderInline(text)}
            </h1>
          )
        }
        if (token.depth === 2) {
          return (
            <h2
              key={index}
              className="text-sm md:text-base font-bold text-slate-900 dark:text-white mt-3.5 mb-1.5 pb-1 border-b border-slate-200/60 dark:border-[#23272F]/60 flex items-center gap-1.5"
            >
              {renderInline(text)}
            </h2>
          )
        }
        if (token.depth === 3) {
          return (
            <h3
              key={index}
              className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1"
            >
              {renderInline(text)}
            </h3>
          )
        }
        return (
          <h4
            key={index}
            className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-2.5 mb-1"
          >
            {renderInline(text)}
          </h4>
        )
      }

      case 'code': {
        return (
          <CodeBlock
            key={index}
            code={token.text}
            language={token.lang}
          />
        )
      }

      case 'paragraph': {
        return (
          <p key={index} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-2">
            {renderInline(token.text)}
          </p>
        )
      }

      case 'list': {
        const isOrdered = token.ordered
        const items = token.items as Tokens.ListItem[]

        if (isOrdered) {
          return (
            <ol key={index} className="list-decimal list-outside ml-5 my-2.5 space-y-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {items.map((it, i) => (
                <li key={i} className="pl-1">
                  {renderInline(it.text)}
                </li>
              ))}
            </ol>
          )
        }

        return (
          <ul key={index} className="my-2.5 space-y-1 text-xs text-slate-700 dark:text-slate-300">
            {items.map((it, i) => {
              if (it.task) {
                return (
                  <li key={i} className="flex items-start gap-2 py-0.5">
                    <span className="mt-0.5 shrink-0">
                      {it.checked ? (
                        <span className="w-3.5 h-3.5 rounded bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded border border-slate-400 dark:border-slate-600 inline-block" />
                      )}
                    </span>
                    <span className={it.checked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}>
                      {renderInline(it.text)}
                    </span>
                  </li>
                )
              }

              return (
                <li key={i} className="flex items-start gap-2 pl-1 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{renderInline(it.text)}</span>
                </li>
              )
            })}
          </ul>
        )
      }

      case 'blockquote': {
        return (
          <blockquote
            key={index}
            className="my-3 pl-3.5 py-1 border-l-2 border-blue-500/80 bg-blue-500/5 dark:bg-blue-950/20 text-xs italic text-slate-600 dark:text-slate-300 rounded-r-md"
          >
            {renderInline(token.text)}
          </blockquote>
        )
      }

      case 'table': {
        const header = token.header as Tokens.TableCell[]
        const rows = token.rows as Tokens.TableCell[][]
        return (
          <div key={index} className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-[#23272F]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-[#15181F] text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-[#23272F]">
                <tr>
                  {header.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3 py-2">
                      {renderInline(cell.text)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-[#20242D]">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-[#1A1D24]/60">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {renderInline(cell.text)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      case 'hr': {
        return <hr key={index} className="my-4 border-slate-200 dark:border-[#23272F]" />
      }

      case 'image': {
        return (
          <div key={index} className="my-3 flex flex-col items-center">
            <img
              src={token.href}
              alt={token.text || 'Diagram or preview'}
              onClick={() => onImageClick && onImageClick(token.href, token.text)}
              className="max-h-96 rounded-lg border border-slate-200 dark:border-[#23272F] shadow-sm hover:ring-2 hover:ring-blue-500/50 cursor-pointer transition-all object-contain bg-white dark:bg-[#0A0C10]"
            />
            {token.text && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                {token.text}
              </span>
            )}
          </div>
        )
      }

      case 'space': {
        return null
      }

      default: {
        return (
          <div key={index} className="text-xs text-slate-700 dark:text-slate-300 my-1">
            {renderInline(token.raw || '')}
          </div>
        )
      }
    }
  }

  return (
    <div className={`rich-markdown space-y-1 ${className}`}>
      {tokens.map((tok, idx) => renderToken(tok, idx))}
    </div>
  )
}
