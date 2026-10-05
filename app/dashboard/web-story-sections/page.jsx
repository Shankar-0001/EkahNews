import TaxonomyManager from '@/components/dashboard/TaxonomyManager'
export default function WebStorySectionsPage() { return <TaxonomyManager title="Web Story Sections" description="Manage separate Web Story sections without changing normal article taxonomy." endpoint="/api/web-story-sections" responseKey="sections" sectionType="web-story-section" /> }
