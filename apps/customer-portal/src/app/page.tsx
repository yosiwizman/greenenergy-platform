import { Card } from '@greenenergy/ui';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Card>
        <Card.Header>
          <Card.Title>Welcome to Your Project Portal</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="mb-4">
            Access your solar installation project details by logging in with your magic link.
          </p>
          <p className="text-sm text-gray-600">
            Check your email for the secure login link we sent you.
          </p>
        </Card.Content>
      </Card>

      <div className="mt-8 rounded-lg bg-blue-50 p-6">
        <h2 className="mb-2 text-lg font-semibold text-blue-900">What you can do here:</h2>
        <ul className="space-y-2 text-blue-800">
          <li>• Track your project status in real-time</li>
          <li>• View installation photos</li>
          <li>• Download project documents</li>
          <li>• Communicate with your project team</li>
        </ul>
      </div>
    </main>
  );
}
