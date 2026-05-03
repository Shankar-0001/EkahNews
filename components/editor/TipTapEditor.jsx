'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Underline from '@tiptap/extension-underline'
import { Youtube } from '@tiptap/extension-youtube'
import { Image } from '@tiptap/extension-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Quote, Minus, Table as TableIcon, Link as LinkIcon, ImageIcon,
  Youtube as YoutubeIcon, Heading1, Heading2, Heading3, Heading4,
  Strikethrough, Eraser, Link2Off
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

export default function TipTapEditor({ content, onChange, onImageUpload }) {
  const [linkUrl, setLinkUrl] = useState('')
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [showYoutubeDialog, setShowYoutubeDialog] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const html = editor.getHTML()
      onChange({ json, html })
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[400px] max-w-none p-4',
      },
    },
  })

  useEffect(() => {
    if (!editor) return

    const nextContent = content || ''
    const currentContent = editor.getHTML()

    if (currentContent !== nextContent) {
      editor.commands.setContent(nextContent, {
        emitUpdate: false,
      })
    }
  }, [content, editor])

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0]
    if (file && onImageUpload) {
      const url = await onImageUpload(file)
      if (url && editor) {
        editor.chain().focus().setImage({ src: url, alt: imageAlt || file.name }).run()
      }
    }
  }

  const handleImageUrl = () => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt }).run()
      setImageUrl('')
      setImageAlt('')
      setShowImageDialog(false)
    }
  }

  const handleLink = () => {
    if (linkUrl && editor) {
      editor
        .chain()
        .focus()
        .setLink({
          href: linkUrl,
          target: linkOpenInNewTab ? '_blank' : null
        })
        .run()
      setLinkUrl('')
      setShowLinkDialog(false)
    }
  }

  const handleYoutube = () => {
    if (youtubeUrl && editor) {
      editor.commands.setYoutubeVideo({
        src: youtubeUrl,
        width: 640,
        height: 480,
      })
      setYoutubeUrl('')
      setShowYoutubeDialog(false)
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-lg">
      <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={editor.isActive('heading', { level: 4 }) ? 'bg-gray-200' : ''}
        >
          <Heading4 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
          className={editor.isActive('heading', { level: 5 }) ? 'bg-gray-200' : ''}
        >
          H5
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
          className={editor.isActive('heading', { level: 6 }) ? 'bg-gray-200' : ''}
        >
          H6
        </Button>
        <div className="w-px bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-gray-200' : ''}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-gray-200' : ''}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <div className="w-px bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-gray-200' : ''}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="w-px bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Link</DialogTitle>
              <DialogDescription className="sr-only">
                Add a URL and choose whether the link should open in a new tab.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>URL</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="newTab"
                  name="openInNewTab"
                  checked={linkOpenInNewTab}
                  onChange={(e) => setLinkOpenInNewTab(e.target.checked)}
                />
                <Label htmlFor="newTab">Open in new tab</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleLink}>Insert Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Image</DialogTitle>
              <DialogDescription className="sr-only">
                Upload an image or provide an image URL and required alt text.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Upload from device</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFile}
                />
              </div>
              <div className="text-center text-sm text-gray-500">OR</div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <Label>Alt Text (required)</Label>
                <Input
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Description of image"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleImageUrl} disabled={!imageUrl || !imageAlt}>
                Insert Image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showYoutubeDialog} onOpenChange={setShowYoutubeDialog}>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm">
              <YoutubeIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Embed YouTube Video</DialogTitle>
              <DialogDescription className="sr-only">
                Paste a YouTube URL to embed the video in the article content.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>YouTube URL</Label>
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleYoutube}>Embed Video</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <BubbleMenu
        editor={editor}
        options={{ placement: 'top', offset: 8 }}
        shouldShow={({ editor }) => {
          const { state } = editor
          return !state.selection.empty
        }}
      >
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-2 py-1 shadow-lg backdrop-blur animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('underline') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('strike') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-gray-200" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('heading', { level: 4 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Heading 4"
          >
            <Heading4 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
            className={`h-8 rounded-full px-2 flex items-center justify-center ${editor.isActive('heading', { level: 5 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Heading 5"
          >
            H5
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
            className={`h-8 rounded-full px-2 flex items-center justify-center ${editor.isActive('heading', { level: 6 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Heading 6"
          >
            H6
          </button>
          <div className="mx-1 h-5 w-px bg-gray-200" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Bullet list"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`h-8 w-8 rounded-full flex items-center justify-center ${editor.isActive('blockquote') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            aria-label="Quote"
          >
            <Quote className="h-4 w-4" />
          </button>
          {editor.isActive('link') ? (
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100"
              aria-label="Remove link"
            >
              <Link2Off className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowLinkDialog(true)}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100"
              aria-label="Insert link"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100"
            aria-label="Remove formatting"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} />
    </div>
  )
}
