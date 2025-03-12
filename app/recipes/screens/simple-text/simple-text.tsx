import { PreSatori } from "@/utils/pre-satori";

export default function SimpleText() {
	return (
		<PreSatori>
			{(transform) => (
				<>
					{transform(
						// required as parent cannot access children props, so we need to pass the transform function to the children
						// make a pixle checkerboard of white and black for debug purposes
						<div className="w-[800px] h-[480px] bg-white flex flex-col items-center justify-center">
							<div className="text-6xl">Hello World</div>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
