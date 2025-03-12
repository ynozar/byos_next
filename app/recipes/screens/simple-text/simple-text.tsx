import { PreSatori } from "@/utils/pre-satori";

export default function SimpleText() {
	return (
		<PreSatori>
			{(transform) => (
				<>
					{transform(
						// required as parent cannot access children props, so we need to pass the transform function to the children
						// make a pixle checkerboard of white and black for debug purposes
						<div className="w-[800px] h-[480px] bg-white flex flex-col p-0 m-0">
						{/* <div className="w-[800px] h-[480px] bg-white flex flex-col p-0 m-0" style={{backgroundRepeat: "repeat", backgroundSize: "2px 2px", backgroundImage: "linear-gradient(to right, #fcc 1px, #cfc 1px), linear-gradient(to bottom, #fcc 1px, #cfc 1px)"}}> */}
							<div className="text-[65px] ml-[100px] mt-[100px]">Hello World</div>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
