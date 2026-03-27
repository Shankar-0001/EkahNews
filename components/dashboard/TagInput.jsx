'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

function normalizeTagName(value = '') {
  return value
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeTagSlug(value = '') {
  return normalizeTagName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function TagInput({
  label = 'Tags',
  tags = [],
  value = [],
  onChange,
  onCreateTag,
  description = 'Type a tag and press Enter to add it. Press Backspace on an empty field to remove the last tag.',
}) {
  const [draft, setDraft] = useState('')
  const selectedIds = Array.isArray(value) ? value : []

  const tagMap = useMemo(
    () => new Map((tags || []).map((tag) => [tag.id, tag])),
    [tags]
  )

  const selectedTags = useMemo(
    () => selectedIds.map((id) => tagMap.get(id)).filter(Boolean),
    [selectedIds, tagMap]
  )

  const availableTags = useMemo(
    () => (tags || []).filter((tag) => !selectedIds.includes(tag.id)),
    [tags, selectedIds]
  )

  const addTagId = (tagId) => {
    if (!tagId || selectedIds.includes(tagId)) return
    onChange([...selectedIds, tagId])
    setDraft('')
  }

  const removeTagId = (tagId) => {
    onChange(selectedIds.filter((id) => id !== tagId))
  }

  const handleAdd = async (rawValue) => {
    const normalizedName = normalizeTagName(rawValue)
    const normalizedSlug = normalizeTagSlug(rawValue)

    if (!normalizedName || !normalizedSlug) return

    const existingTag = (tags || []).find((tag) =>
      tag.name?.toLowerCase() === normalizedName.toLowerCase()
      || tag.slug?.toLowerCase() === normalizedSlug
    )

    if (existingTag) {
      addTagId(existingTag.id)
      return
    }

    if (!onCreateTag) return
    const createdTag = await onCreateTag(normalizedName)
    if (createdTag?.id) {
      addTagId(createdTag.id)
    }
  }

  const handleKeyDown = async (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      await handleAdd(draft)
    }

    if (event.key === 'Backspace' && !draft && selectedTags.length > 0) {
      removeTagId(selectedTags[selectedTags.length - 1].id)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a tag and press Enter"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => handleAdd(draft)}
          disabled={!draft.trim()}
        >
          Add
        </Button>
      </div>

      <div className="min-h-8 flex flex-wrap gap-2">
        {selectedTags.length > 0 ? selectedTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="flex items-center gap-1 pr-1">
            <span>{tag.name}</span>
            <button
              type="button"
              onClick={() => removeTagId(tag.id)}
              className="rounded-full p-0.5 hover:bg-black/10"
              aria-label={`Remove tag ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )) : (
          <p className="text-sm text-gray-500">No tags added yet.</p>
        )}
      </div>

      {availableTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Available tags</p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="cursor-pointer"
                onClick={() => addTagId(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
