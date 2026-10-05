'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DESTINATION_FIELDS } from '@/lib/navigation-model.mjs'

const empty = {key:'',title:'',parent_id:'',sort_order:0,is_enabled:true,destination_type:'internal',custom_path:'/',page_title:'',description:''}
const selectClass = 'w-full rounded-md border bg-background p-2 text-foreground'
export default function NavigationManager() {
  const [data,setData] = useState(null)
  const [form,setForm] = useState(null)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [busy,setBusy] = useState(false)
  async function load() {
    const response = await fetch('/api/admin/navigation',{cache:'no-store'})
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Navigation could not be loaded')
    setData(body)
  }
  useEffect(() => { load().catch(e => setError(e.message)) },[])
  const update = (key,value) => setForm(current => ({...current,[key]:value}))
  async function save(event) {
    event.preventDefault();setBusy(true);setError('');setMessage('')
    try {
      const response = await fetch('/api/admin/navigation',{method:form.id ? 'PATCH' : 'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Menu could not be saved')
      await load();setForm(null);setMessage('Menu saved. Reload the public page to see the updated navigation.')
    } catch (error) {setError(error.message)} finally {setBusy(false)}
  }
  const options = !form ? [] : ({category:data?.categories,subcategory:data?.subcategories,topic:data?.topics,landing:data?.landings}[form.destination_type] || [])
  const field = form && DESTINATION_FIELDS[form.destination_type]
  return <div className="space-y-6 p-6">
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Navigation</h1><p className="text-muted-foreground">Manage menus and submenus independently of article categories.</p></div><Button disabled={!data || busy} onClick={() => {setForm({...empty});setError('')}}>Add menu</Button></div>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!data && !error && <p>Loading navigation?</p>}
    {form && <form onSubmit={save} className="space-y-4 rounded-lg border p-5">
      <h2 className="text-xl font-semibold">{form.id ? 'Edit menu' : 'Add menu'}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label>Title<Input required maxLength={160} value={form.title} onChange={e=>update('title',e.target.value)}/></label>
        <label>Menu key<Input required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.key} onChange={e=>update('key',e.target.value)}/></label>
        <label>Parent menu<select className={selectClass} value={form.parent_id || ''} onChange={e=>update('parent_id',e.target.value)}><option value="">Main menu</option>{data.items.filter(i=>!i.parent_id && i.id!==form.id).map(i=><option key={i.id} value={i.id}>{i.title}</option>)}</select></label>
        <label>Display order<Input type="number" required min={0} max={1000000} step={1} value={form.sort_order} onChange={e=>update('sort_order',Number(e.target.value))}/><span className="text-sm text-muted-foreground">Lower numbers appear first within the same parent.</span></label>
        <label>Destination type<select className={selectClass} value={form.destination_type} onChange={e=>update('destination_type',e.target.value)}>{[['internal','Internal page'],['category','Category'],['subcategory','Subcategory'],['topic','Topic'],['landing','Editorial landing'],['web_stories','Web Stories'],['sponsored','Sponsored']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        {field && <label>Destination<select required className={selectClass} value={form[field] || ''} onChange={e=>update(field,e.target.value)}><option value="">Select destination</option>{options.map(i=><option key={i.id} value={i.id}>{i.menu_key ? i.menu_key+' / ' : ''}{i.title || i.name}</option>)}</select></label>}
        {form.destination_type==='internal' && <label>Internal path<Input required value={form.custom_path || ''} placeholder="/latest-news" onChange={e=>update('custom_path',e.target.value)}/></label>}
        <label>Page title<Input maxLength={2000} value={form.page_title || ''} onChange={e=>update('page_title',e.target.value)}/></label>
        <label>Description<Input maxLength={2000} value={form.description || ''} onChange={e=>update('description',e.target.value)}/></label>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_enabled} onChange={e=>update('is_enabled',e.target.checked)}/>Enabled (disabling a parent hides its submenus)</label>
      <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy?'Saving?':'Save menu'}</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>setForm(null)}>Cancel</Button></div>
    </form>}
    {data && <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Menu','Parent','Order','Visibility','Destination',''].map((t,i)=><th className="border-b p-3" key={i}>{t}</th>)}</tr></thead><tbody>{data.items.map(item=><tr key={item.id}><td className="border-b p-3">{item.title}</td><td className="border-b p-3">{data.items.find(p=>p.id===item.parent_id)?.title || 'Main menu'}</td><td className="border-b p-3">{item.sort_order}</td><td className="border-b p-3">{item.is_enabled?'Enabled':'Disabled'}</td><td className="border-b p-3">{item.destination_type}</td><td className="border-b p-3"><Button variant="outline" disabled={busy} onClick={()=>{setForm({...item});setMessage('');setError('')}}>Edit {item.title}</Button></td></tr>)}</tbody></table></div>}
  </div>
}
