// Import the necessary components and hooks
import DocumentList from "@/components/Documents/DocumentList";
import { useSWRF } from "@/lib/swr";

// Define the Cluster component with destructured props for cleaner access
export default function Cluster({ id }) {
  // Extract the cluster ID from the props
  const clusterId = id.split("%")[0];
  // Initialize the SWR hook for data fetching
  
  // Use the SWR hook to fetch the cluster data based on the clusterId
  const { data: cluster } = useSWRF(`/api/clusters/${clusterId}`);
  
  // Format the data for the DocumentList component
  // Check if cluster history exists and map the documents to the required format
  const data = cluster?.history?.[0]?.included_documents.map(document => [document, 1.0]) || [];

  // Render the DocumentList component with the formatted data and various props
  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <DocumentList
        data={data}
        pagination={true}
        showClusterIcon={false}
        showOrientIcon={true}
        showRemoveIcon={true}
        group={cluster}
      />
    </div>
  );
}
