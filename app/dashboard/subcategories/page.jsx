import TaxonomyManager from '@/components/dashboard/TaxonomyManager'
export default function SubcategoriesPage() { return <TaxonomyManager title="Subcategories" description="Manage parent-child editorial taxonomy and database-driven submenu settings." endpoint="/api/subcategories" responseKey="subcategories" sectionType="subcategory" /> }
