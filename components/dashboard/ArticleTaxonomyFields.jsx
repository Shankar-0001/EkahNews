'use client'
import {useEffect,useState} from 'react'
export default function ArticleTaxonomyFields({categories,primaryId,additionalIds,onAdditionalChange,subcategoryId,onSubcategoryChange,topicIds,onTopicsChange}) {
  const [options,setOptions]=useState(null)
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;fetch('/api/article-taxonomy',{cache:'no-store'}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||'Taxonomy unavailable');if(active)setOptions(body)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[])
  const toggle=(items,id,checked)=>checked?[...new Set([...items,id])]:items.filter(v=>v!==id)
  return <section className="space-y-4 rounded-lg border p-4">
    <h2 className="text-lg font-semibold">Additional taxonomy</h2>
    <p className="text-sm text-muted-foreground">The primary category owns the article URL. Additional categories and topics help readers discover it.</p>
    <fieldset><legend className="mb-2 font-medium">Additional categories</legend><div className="grid gap-2 sm:grid-cols-2">{categories.filter(c=>c.id!==primaryId).map(c=><label key={c.id} className="flex items-center gap-2"><input type="checkbox" checked={additionalIds.includes(c.id)} onChange={e=>onAdditionalChange(toggle(additionalIds,c.id,e.target.checked))}/>{c.name}</label>)}</div></fieldset>
    {error && <p role="alert">{error} Existing selections will be retained.</p>}
    {!options&&!error&&<p role="status">Loading subcategories and topics?</p>}
    {options && <>
      <label className="block font-medium">Subcategory<select className="mt-2 block w-full rounded-md border bg-background p-2" value={subcategoryId} onChange={e=>onSubcategoryChange(e.target.value)}><option value="">No subcategory</option>{options.subcategories.filter(s=>s.category_id===primaryId&&(s.is_active||s.id===subcategoryId)).map(s=><option key={s.id} value={s.id}>{s.name}{s.is_active?'':' (inactive)'}</option>)}</select></label>
      <fieldset><legend className="mb-2 font-medium">Topics</legend>{!options.topics.length&&<p className="text-sm text-muted-foreground">No editorial topics have been defined yet.</p>}<div className="grid gap-2 sm:grid-cols-2">{options.topics.filter(t=>t.is_active||topicIds.includes(t.id)).map(t=><label key={t.id} className="flex items-center gap-2"><input type="checkbox" checked={topicIds.includes(t.id)} onChange={e=>onTopicsChange(toggle(topicIds,t.id,e.target.checked))}/>{t.name}{t.is_active?'':' (inactive)'}</label>)}</div></fieldset>
    </>}
  </section>
}
