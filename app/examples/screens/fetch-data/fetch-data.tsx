import { PreSatori } from "@/utils/pre-satori";

interface WikipediaArticleProps {
  title?: string;
  extract?: string;
  url?: string;
}

export default function FetchData({
  title="",
  extract="",
  url="",
}: WikipediaArticleProps) {

  return (
    <PreSatori>{(transform) => (
      <>{transform(
        <div className="w-[800px] h-[480px] bg-white flex flex-col rounded-lg overflow-hidden shadow-[0_0_40px_-15px_rgba(0,0,0,0.3)] border border-gray-200">
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          tabIndex={0}
          aria-label={`View full article about ${title} on Wikipedia`}
        >
          View on Wikipedia
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 ml-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
            />
          </svg>
        </a>
      </div>
      <div className="p-6 overflow-y-auto flex-grow">
        <p className="text-gray-700 leading-relaxed">{extract}</p>
      </div>
    </div>
        </div>
      )}</>
    )}</PreSatori>
  );
} 