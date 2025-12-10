import { Card } from '@greenenergy/ui';

export default function CommandCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Command Center</h2>
        <p className="mt-1 text-sm text-gray-600">Overview of all operations and key metrics</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <Card.Header>
            <Card.Title>Active Jobs</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="text-3xl font-bold text-primary-600">0</div>
            <p className="text-sm text-gray-600">Placeholder - to be implemented</p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>High Risk Flags</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="text-3xl font-bold text-red-600">0</div>
            <p className="text-sm text-gray-600">Placeholder - to be implemented</p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>QC Pending</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="text-3xl font-bold text-yellow-600">0</div>
            <p className="text-sm text-gray-600">Placeholder - to be implemented</p>
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Recent Activity</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-gray-600">Real-time activity feed will be implemented in Phase 1.</p>
        </Card.Content>
      </Card>
    </div>
  );
}
