import DashboardLayout from "../layouts/DashboardLayout";

function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-2 text-gray-600">Adjust your preferences and account controls.</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <h2 className="font-semibold">Email Notifications</h2>
                <p className="text-sm text-gray-500">Receive updates about messages and payments.</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <h2 className="font-semibold">Profile Visibility</h2>
                <p className="text-sm text-gray-500">Show your profile to potential clients.</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Settings;
