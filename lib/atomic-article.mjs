import deploymentPolicy from './deployment-policy.server.cjs'
import { UUID } from './navigation-model.mjs'
const fields = new Set(['title','slug','excerpt','content','content_json','category_id','subcategory_id','author_id','featured_image_url','featured_image_alt','og_image','seo_title','seo_description','canonical_url','schema_type','structured_data','keywords','status','published_at','updated_at'])
const relations = {additional_category_ids:'p_additional_category_ids',tag_ids:'p_tag_ids',topic_ids:'p_topic_ids'}
function invalid(message) { const error=new Error(message);error.name='ValidationError';throw error }
export function atomicArticleArguments(input,id=null) {
  if (!input || typeof input!=='object' || Array.isArray(input)) invalid('Article details are required')
  if (id!==null && !UUID.test(id)) invalid('Invalid article ID')
  const args={p_article_id:id,p_changes:{},p_additional_category_ids:null,p_tag_ids:null,p_topic_ids:null}
  for(const [key,value] of Object.entries(input)) {
    if (relations[key]) {
      if (!Array.isArray(value) || value.length>100 || value.some(v=>typeof v!=='string'||!UUID.test(v))) invalid('Choose valid taxonomy records (up to 100 per selection)')
      args[relations[key]]=[...new Set(value)]
    } else if(fields.has(key)) {
      if(value!==undefined) args.p_changes[key]=value
    } else invalid('Unsupported article field')
  }
  if ((!id || 'category_id' in input) && !UUID.test(input.category_id || '')) invalid('A primary category is required, including for drafts')
  if (input.subcategory_id != null && !UUID.test(input.subcategory_id)) invalid('Choose a valid subcategory')
  return args
}
export function assertDeploymentTarget() {
  return deploymentPolicy.assertDeploymentTarget()
}
