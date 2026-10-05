import TaxonomyManager from '@/components/dashboard/TaxonomyManager'
export default function CategoriesPage() { return <TaxonomyManager title="Categories" description="Manage editorial categories, main-menu visibility, page content, and SEO." endpoint="/api/categories" responseKey="categories" sectionType="category" /> }
