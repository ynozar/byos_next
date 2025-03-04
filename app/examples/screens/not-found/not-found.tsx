import { PreSatori } from "@/utils/pre-satori";

export default function NotFoundScreen({ slug }: { slug?: string }) {
  return (
    <PreSatori>{(transform) => (<>{transform(
      <div className="w-[800px] h-[480px] bg-white flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-center">Screen Not Found</div>
        {slug && (
          <div className="text-xl mt-4 text-gray-600 text-center">
            Could not find screen: {slug}
          </div>
        )}
        <div className="text-md mt-8 text-gray-500 text-center">
          Please check your configuration or create this screen.
        </div>
      </div>
    )}</>)}</PreSatori>
  );
} 