import {
  CheckCircle,
  MessageCircle,
  Wallet,
  Briefcase,
} from "lucide-react";

const activities = [
  {
    id: 1,
    icon: <CheckCircle className="text-green-500" size={20} />,
    title: "Proposal Accepted",
    description: "Your proposal for E-Commerce Website was accepted.",
    time: "10 mins ago",
  },
  {
    id: 2,
    icon: <MessageCircle className="text-blue-500" size={20} />,
    title: "New Message",
    description: "Client sent you a new message.",
    time: "35 mins ago",
  },
  {
    id: 3,
    icon: <Wallet className="text-purple-500" size={20} />,
    title: "Payment Received",
    description: "₹12,000 credited successfully.",
    time: "Yesterday",
  },
  {
    id: 4,
    icon: <Briefcase className="text-orange-500" size={20} />,
    title: "Project Started",
    description: "Portfolio Website project is now active.",
    time: "2 days ago",
  },
];

const RecentActivity = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 h-full">

      <h2 className="text-xl font-bold mb-6">
        Recent Activity
      </h2>

      <div className="space-y-5">

        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 border-b pb-4 last:border-none"
          >
            <div className="bg-gray-100 rounded-full p-3">
              {activity.icon}
            </div>

            <div className="flex-1">

              <h3 className="font-semibold">
                {activity.title}
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                {activity.description}
              </p>

              <span className="text-xs text-gray-400">
                {activity.time}
              </span>

            </div>
          </div>
        ))}

      </div>

    </div>
  );
};

export default RecentActivity;