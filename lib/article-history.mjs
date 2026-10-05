// Resolve by immutable article ID, so multiple historical slug changes need no chain walk.
export async function publishedArticleFromHistory(db,slug) {
 const history=await db.from('slug_history').select('article_id').eq('old_slug',slug).order('created_at',{ascending:false}).limit(1).maybeSingle()
 if(history.error)throw new Error('Article history unavailable')
 if(!history.data?.article_id)return null
 const article=await db.from('articles').select('slug, categories:categories!articles_category_id_fkey(slug)').eq('id',history.data.article_id).eq('status','published').maybeSingle()
 if(article.error)throw new Error('Historical article unavailable')
 return article.data || null
}
