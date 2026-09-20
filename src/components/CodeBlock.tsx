import React, { useState, useMemo } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-hcl'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-docker'

import { Check, Copy, FileCode, Terminal, Database, Settings } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  className?: string
}

// Normalize language alias to Prism grammar
function normalizeLanguage(lang: string = ''): string {
  const clean = lang.toLowerCase().trim()
  if (['tf', 'terraform', 'hcl'].includes(clean)) return 'hcl'
  if (['yml', 'yaml'].includes(clean)) return 'yaml'
  if (['py', 'python'].includes(clean)) return 'python'
  if (['sh', 'bash', 'shell', 'zsh'].includes(clean)) return 'bash'
  if (['json'].includes(clean)) return 'json'
  if (['sql', 'mysql', 'postgres', 'postgresql', 'sqlite'].includes(clean)) return 'sql'
  if (['ts', 'typescript'].includes(clean)) return 'typescript'
  if (['js', 'javascript'].includes(clean)) return 'javascript'
  if (['dockerfile', 'docker'].includes(clean)) return 'docker'
  if (['md', 'markdown'].includes(clean)) return 'markdown'
  return clean || 'text'
}

function getLanguageLabel(lang: string = ''): { label: string; icon: React.FC<{ className?: string }> } {
  const norm = normalizeLanguage(lang)
  switch (norm) {
    case 'hcl':
      return { label: 'Terraform / HCL', icon: FileCode }
    case 'yaml':
      return { label: 'YAML', icon: Settings }
    case 'python':
      return { label: 'Python', icon: Terminal }
    case 'bash':
      return { label: 'Bash', icon: Terminal }
    case 'json':
      return { label: 'JSON', icon: FileCode }
    case 'sql':
      return { label: 'SQL', icon: Database }
    case 'typescript':
      return { label: 'TypeScript', icon: FileCode }
    case 'javascript':
      return { label: 'JavaScript', icon: FileCode }
    case 'docker':
      return { label: 'Dockerfile', icon: Terminal }
    case 'markdown':
      return { label: 'Markdown', icon: FileCode }
    default:
      return { label: lang ? lang.toUpperCase() : 'Code', icon: FileCode }
  }
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  filename,
  showLineNumbers = false,
  className = ''
}) => {
  const [copied, setCopied] = useState(false)

  const normalizedLang = normalizeLanguage(language)
  const { label, icon: IconComponent } = getLanguageLabel(language)

  const highlightedHtml = useMemo(() => {
    const rawCode = (code || '').replace(/\r\n/g, '\n')
    const grammar = Prism.languages[normalizedLang]
    if (grammar) {
      try {
        return Prism.highlight(rawCode, grammar, normalizedLang)
      } catch {
        return escapeHtml(rawCode)
      }
    }
    return escapeHtml(rawCode)
  }, [code, normalizedLang])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = useMemo(() => {
    return (code || '').replace(/\r\n/g, '\n').split('\n')
  }, [code])

  return (
    <div className={`my-3 rounded-xl border border-slate-200 dark:border-[#262B35] bg-[#0E1116] overflow-hidden shadow-xs text-xs font-mono select-text group/code ${className}`}>
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#14171E] border-b border-slate-200/20 dark:border-[#222732] select-none">
        <div className="flex items-center gap-2">
          <IconComponent className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-semibold text-slate-300">
            {filename || label}
          </span>
          {filename && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
              ({label})
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-sans font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-all cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400 group-hover/code:text-slate-200" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Code body with optional line numbers */}
      <div className="overflow-x-auto p-3 text-[12px] leading-relaxed">
        {showLineNumbers ? (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => {
                const lineGrammar = Prism.languages[normalizedLang]
                let lineHtml = escapeHtml(line)
                if (lineGrammar) {
                  try {
                    lineHtml = Prism.highlight(line, lineGrammar, normalizedLang)
                  } catch {
                    lineHtml = escapeHtml(line)
                  }
                }
                return (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="pr-4 text-right select-none text-slate-600 font-mono text-[11px] w-8 align-top">
                      {idx + 1}
                    </td>
                    <td className="align-top font-mono text-slate-200 whitespace-pre">
                      <span dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <pre className="font-mono text-slate-200 whitespace-pre overflow-x-auto">
            <code
              className={`language-${normalizedLang}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>
        )}
      </div>
    </div>
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
