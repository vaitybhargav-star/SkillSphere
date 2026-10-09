import { Eye } from "lucide-react";

const projects = [
  {
    id: 1,
    name: "E-Commerce Website",
    client: "John Smith",
    budget: "₹45,000",
    progress: 80,
    status: "In Progress",
  },
  {
    id: 2,
    name: "Portfolio Website",
    client: "Sarah Johnson",
    budget: "₹18,000",
    progress: 100,
    status: "Completed",
  },
  {
    id: 3,
    name: "Restaurant App",
    client: "Michael Brown",
    budget: "₹72,000",
    progress: 45,
    status: "In Progress",
  },
];

const ActiveProjects = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">

      <div className="flex justify-between items-center mb-6">

        <h2 className="text-2xl font-bold">
          Active Projects
        </h2>

        <button className="text-blue-600 font-semibold hover:underline">
          View All
        </button>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead>

            <tr className="text-left border-b">

              <th className="py-3">Project</th>
              <th>Client</th>
              <th>Budget</th>
              <th>Progress</th>
              <th>Status</th>
              <th></th>

            </tr>

          </thead>

          <tbody>

            {projects.map((project) => (

              <tr
                key={project.id}
                className="border-b hover:bg-gray-50 transition"
              >

                <td className="py-5 font-medium">
                  {project.name}
                </td>

                <td>
                  {project.client}
                </td>

                <td>
                  {project.budget}
                </td>

                <td className="w-56">

                  <div className="w-full bg-gray-200 rounded-full h-3">

                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{
                        width: `${project.progress}%`,
                      }}
                    ></div>

                  </div>

                  <p className="text-xs mt-1 text-gray-500">
                    {project.progress}%
                  </p>

                </td>

                <td>

                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      project.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {project.status}
                  </span>

                </td>

                <td>

                  <button className="text-blue-600 hover:text-blue-800">
                    <Eye size={20} />
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
};

export default ActiveProjects;