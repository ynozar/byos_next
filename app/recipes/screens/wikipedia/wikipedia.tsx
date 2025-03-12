import { PreSatori } from "@/utils/pre-satori";
interface WikipediaArticleProps {
	title?: string;
	extract?: string;
	url?: string;
	thumbnail?: {
		source?: string;
		width?: number;
		height?: number;
	};
}

export default function Wikipedia({
	title = "Loading article...",
	extract = "Article content is loading or unavailable.",
	thumbnail = {
		source: "",
		width: 0,
		height: 0,
	},
}: WikipediaArticleProps) {
	// Ensure we have valid data to display
	const hasValidThumbnail = thumbnail?.source ? thumbnail.source.startsWith("https://") : false;
	
	return (
		<PreSatori>
			{(transform) => (
				<>
					{transform(
						<div className="flex flex-col w-[800px] h-[480px] bg-white">
							<div className="flex flex-col px-4 border-b border-black">
								<h1 className="text-[48px] text-black">{title}</h1>
							</div>
							<div className="flex flex-1 overflow-hidden">
								<div className="p-4 overflow-y-auto flex-1">
									{hasValidThumbnail && (
										<div className="">
											<picture>
												{/* YOU CANNOT USE NEXTJS IMAGE COMPONENT HERE, BECAUSE SATORI DOES NOT SUPPORT IT */}
												<source srcSet={thumbnail.source} type="image/webp" />
												<img
													src={thumbnail.source}
													alt={title}
													width={thumbnail.width}
													height={thumbnail.height}
													style={{
														width: "300px",
														height:
															thumbnail.height && thumbnail.width
																? `${Math.round(
																		thumbnail.height * (300 / thumbnail.width),
																	)}px`
																: "auto",
														maxWidth: "300px",
													}}
												/>
											</picture>
										</div>
									)}
									<p className="text-black leading-[24px] text-[26px] -mt-1 ml-2">
										{extract}
									</p>
								</div>
							</div>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
