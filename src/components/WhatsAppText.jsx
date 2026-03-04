/**
 * WhatsAppText.jsx
 * Renders WhatsApp-style markdown as formatted HTML.
 * Supports: *bold*, _italic_, ~strikethrough~, `code`, line breaks, bullet lists (-)
 */

/**
 * Parse a single line into React spans with formatting applied.
 * Handles nested inline markers: *bold*, _italic_, ~strike~, `code`
 */
function parseInline(text) {
    // Tokenise the line into segments: { type: 'text'|'bold'|'italic'|'strike'|'code', content }
    const segments = []
    const patterns = [
        { re: /\*([^*]+)\*/g, type: 'bold' },
        { re: /_([^_]+)_/g, type: 'italic' },
        { re: /~([^~]+)~/g, type: 'strike' },
        { re: /`([^`]+)`/g, type: 'code' },
    ]

    // Build an array of { start, end, type, content } matches
    const matches = []
    for (const { re, type } of patterns) {
        let m
        re.lastIndex = 0
        while ((m = re.exec(text)) !== null) {
            matches.push({ start: m.index, end: m.index + m[0].length, type, content: m[1] })
        }
    }
    // Sort by start position
    matches.sort((a, b) => a.start - b.start)

    // Merge non-overlapping matches with plain text gaps
    let cursor = 0
    for (const match of matches) {
        if (match.start < cursor) continue // overlapping, skip
        if (match.start > cursor) segments.push({ type: 'text', content: text.slice(cursor, match.start) })
        segments.push({ type: match.type, content: match.content })
        cursor = match.end
    }
    if (cursor < text.length) segments.push({ type: 'text', content: text.slice(cursor) })

    return segments
}

function InlineSegments({ segments }) {
    return segments.map((seg, i) => {
        switch (seg.type) {
            case 'bold': return <strong key={i} className="font-semibold">{seg.content}</strong>
            case 'italic': return <em key={i} className="italic">{seg.content}</em>
            case 'strike': return <s key={i} className="line-through text-gray-400">{seg.content}</s>
            case 'code': return <code key={i} className="bg-gray-100 px-1 rounded text-xs font-mono">{seg.content}</code>
            default: return <span key={i}>{seg.content}</span>
        }
    })
}

/**
 * WhatsAppText
 * Props:
 *   text: string — raw WhatsApp-formatted text
 *   className: string — optional wrapper class
 */
export function WhatsAppText({ text = '', className = '' }) {
    if (!text) return null

    const lines = text.split('\n')

    return (
        <div className={`text-sm leading-relaxed whitespace-pre-wrap font-sans ${className}`}>
            {lines.map((line, i) => {
                // Bullet point
                if (/^- /.test(line)) {
                    const content = line.slice(2)
                    return (
                        <div key={i} className="flex gap-2 pl-2">
                            <span className="text-gray-400 mt-0.5 shrink-0">•</span>
                            <span><InlineSegments segments={parseInline(content)} /></span>
                        </div>
                    )
                }
                // Empty line → spacer
                if (line.trim() === '') return <div key={i} className="h-2" />
                // Normal line
                return (
                    <div key={i}>
                        <InlineSegments segments={parseInline(line)} />
                    </div>
                )
            })}
        </div>
    )
}

export default WhatsAppText