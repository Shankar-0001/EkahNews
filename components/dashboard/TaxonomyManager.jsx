'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Edit, Plus, Trash } from 'lucide-react'
import { createSlug } from '@/lib/slug'

const empty = { name: '', slug: '', nav_label: '', page_title: '', page_description: '', seo_title: '', seo_description: '', menu_order: '0', is_active: true, show_in_menu: false, category_id: '' }

function TaxonomyFields({ value, setValue, parentCategories, sectionType }) {
  const hasParent = sectionType === 'subcategory'
  const menuLabel = hasParent ? 'Show in submenu' : sectionType === 'category' ? 'Show in main menu' : 'Active section'

  const update = (field, next) => setValue((current) => ({
    ...current,
    [field]: next,
    ...(field === 'name' && !current.slug ? { slug: createSlug(next) } : {}),
  }))

  return (
    <div className="space-y-4">
      {hasParent ? (
        <div>
          <Label htmlFor="parent_category">Parent category</Label>
          <select id="parent_category" value={value.category_id} onChange={(event) => update('category_id', event.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select parent category</option>
            {parentCategories.map((category) => <option key={category.id} value={category.id}>{category.nav_label || category.name}</option>)}
          </select>
        </div>
      ) : null}
      <div><Label>Name</Label><Input value={value.name} onChange={(event) => update('name', event.target.value)} placeholder="Internal taxonomy name" /></div>
      <div><Label>Navigation label</Label><Input value={value.nav_label} onChange={(event) => update('nav_label', event.target.value)} placeholder="Label shown in navigation" /></div>
      <div><Label>Slug</Label><Input value={value.slug} onChange={(event) => update('slug', createSlug(event.target.value))} placeholder="seo-friendly-slug" /></div>
      <div><Label>Page title</Label><Input value={value.page_title} onChange={(event) => update('page_title', event.target.value)} placeholder="Visible H1/title for this page" /></div>
      <div><Label>Page description</Label><Textarea value={value.page_description} onChange={(event) => update('page_description', event.target.value)} placeholder="Useful editorial introduction; avoid keyword stuffing" rows={3} /></div>
      <div className="border-t pt-4">
        <p className="mb-3 text-sm font-semibold">SEO</p>
        <div className="space-y-4">
          <div><Label>SEO title</Label><Input value={value.seo_title} maxLength={70} onChange={(event) => update('seo_title', event.target.value)} placeholder="Optional SEO title" /><p className="mt-1 text-xs text-muted-foreground">{value.seo_title.length}/70</p></div>
          <div><Label>Meta description</Label><Textarea value={value.seo_description} maxLength={160} onChange={(event) => update('seo_description', event.target.value)} placeholder="Optional SEO description" rows={3} /><p className="mt-1 text-xs text-muted-foreground">{value.seo_description.length}/160</p></div>
        </div>
      </div>
      <div><Label>Menu order</Label><Input type="number" min="0" value={value.menu_order} onChange={(event) => update('menu_order', event.target.value)} /></div>
      <div className="flex items-center justify-between rounded-md border p-3"><div><Label>{menuLabel}</Label><p className="text-xs text-muted-foreground">Controls visibility after the taxonomy migration is applied.</p></div><Switch checked={value.show_in_menu} onCheckedChange={(checked) => update('show_in_menu', checked)} /></div>
      <div className="flex items-center justify-between rounded-md border p-3"><div><Label>Active</Label><p className="text-xs text-muted-foreground">Inactive records stay preserved but are hidden/noindex.</p></div><Switch checked={value.is_active} onCheckedChange={(checked) => update('is_active', checked)} /></div>
    </div>
  )
}

export default function TaxonomyManager({ title, description, endpoint, responseKey, sectionType = 'category' }) {
  const [items, setItems] = useState([])
  const [parents, setParents] = useState([])
  const [schemaReady, setSchemaReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const parentById = useMemo(() => new Map(parents.map((item) => [item.id, item])), [parents])

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [result, categoryResult] = await Promise.all([
        fetch(endpoint).then(async (response) => ({ response, body: await response.json() })),
        sectionType === 'subcategory' ? fetch('/api/categories?page=1&limit=100').then(async (response) => ({ response, body: await response.json() })) : Promise.resolve(null),
      ])
      if (!result.response.ok) throw new Error(result.body?.error || 'Unable to load taxonomy records')
      setItems(result.body?.data?.[responseKey] || [])
      setSchemaReady(result.body?.data?.schemaReady !== false)
      if (categoryResult?.response?.ok) setParents(categoryResult.body?.data?.categories || [])
    } catch (error) {
      setLoadError(error.message || 'Unable to load taxonomy records')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setCreateOpen(true) }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name || '', slug: item.slug || '', nav_label: item.nav_label || '', page_title: item.page_title || '',
      page_description: item.page_description || '', seo_title: item.seo_title || '', seo_description: item.seo_description || '',
      menu_order: String(item.menu_order || 0), is_active: item.is_active !== false,
      show_in_menu: sectionType === 'subcategory' ? Boolean(item.show_in_submenu) : sectionType === 'category' ? Boolean(item.show_in_main_menu) : Boolean(item.is_active),
      category_id: item.category_id || '',
    })
  }

  const save = async () => {
    const body = {
      ...form,
      ...(editing ? { id: editing.id } : {}),
      ...(sectionType === 'subcategory' ? { show_in_submenu: form.show_in_menu } : sectionType === 'category' ? { show_in_main_menu: form.show_in_menu } : {}),
    }
    const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json()
    if (!response.ok) { alert(result?.error || 'Unable to save'); return }
    setCreateOpen(false); setEditing(null); await load()
  }

  const remove = async (item) => {
    if (!confirm(`Delete "${item.name}"? This should only be used for unreferenced records.`)) return
    const response = await fetch(endpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) })
    const result = await response.json()
    if (!response.ok) { alert(result?.error || 'Unable to delete'); return }
    await load()
  }

  const dialog = (isEditing) => (
    <Dialog open={isEditing ? Boolean(editing) : createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditing(null) } }}>
      {!isEditing ? <DialogTrigger asChild><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New {title.slice(0, -1)}</Button></DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? 'Edit' : 'Create'} {title.slice(0, -1)}</DialogTitle><DialogDescription>Manage navigation, editorial page content, and SEO without changing source code.</DialogDescription></DialogHeader>
        <TaxonomyFields value={form} setValue={setForm} parentCategories={parents} sectionType={sectionType} />
        <DialogFooter><Button onClick={save}>{isEditing ? 'Save changes' : 'Create'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between"><div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-2 text-muted-foreground">{description}</p></div>{dialog(false)}</div>
      {loadError && <p role="alert" className="mb-4 text-red-600">{loadError}</p>}
      {!loading && !loadError && schemaReady && items.length === 0 && <p>No records found.</p>}
      {!schemaReady ? <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">The required isolated-development database migration has not been applied. Existing records can be viewed, but taxonomy settings cannot be saved yet.</div> : null}
      {loading ? <p className="text-muted-foreground">Loading&</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => (
        <Card key={item.id}><CardHeader><CardTitle className="flex items-start justify-between gap-3"><div><span>{item.nav_label || item.name}</span><p className="mt-1 text-xs font-normal text-muted-foreground">{item.slug}{item.category_id ? ` � ${parentById.get(item.category_id)?.nav_label || parentById.get(item.category_id)?.name || 'Parent category'}` : ''}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item)}><Trash className="h-4 w-4" /></Button></div></CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>{item.page_description || item.description || 'No page description.'}</p><p>Order: {item.menu_order || 0} � {item.is_active === false ? 'Inactive' : 'Active'}</p></CardContent></Card>
      ))}</div>}
      {dialog(true)}
    </div>
  )
}
