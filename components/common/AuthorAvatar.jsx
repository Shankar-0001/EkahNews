'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function AuthorAvatar({ name, avatarUrl }) {
  const [avatarMounted, setAvatarMounted] = useState(false)

  useEffect(() => {
    setAvatarMounted(true)
  }, [])

  if (!avatarMounted) {
    return <div className="mb-4 h-32 w-32 rounded-full bg-muted" aria-hidden="true" />
  }

  return (
    <Avatar className="h-32 w-32 mb-4">
      <AvatarImage src={avatarUrl || ''} />
      <AvatarFallback className="text-2xl">
        {(name || '').split(' ').map((n) => n[0]).join('')}
      </AvatarFallback>
    </Avatar>
  )
}
