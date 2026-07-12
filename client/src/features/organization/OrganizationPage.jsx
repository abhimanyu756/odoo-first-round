import { Building2, Tags, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { DepartmentsTab } from './DepartmentsTab';
import { CategoriesTab } from './CategoriesTab';
import { EmployeesTab } from './EmployeesTab';

export default function OrganizationPage() {
  return (
    <div>
      <PageHeader
        title="Organization Setup"
        description="Maintain the master data everything else depends on."
      />
      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">
            <Building2 className="size-4" /> Departments
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tags className="size-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="employees">
            <Users className="size-4" /> Employee Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <Card className="p-4">
            <DepartmentsTab />
          </Card>
        </TabsContent>
        <TabsContent value="categories">
          <Card className="p-4">
            <CategoriesTab />
          </Card>
        </TabsContent>
        <TabsContent value="employees">
          <Card className="p-4">
            <EmployeesTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
