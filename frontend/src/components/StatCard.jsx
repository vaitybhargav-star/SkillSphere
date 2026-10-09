import DashboardLayout from "../layouts/DashboardLayout";
import DashboardHeader from "../components/DashboardHeader";
import StatCard from "../components/StatCard";
import { Wallet } from "lucide-react";

function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardHeader />

      <StatCard
        title="Total Earnings"
        value="₹0"
        icon={<Wallet size={36} />}
        color="bg-blue-600"
      />
    </DashboardLayout>
  );
}

export default Dashboard;