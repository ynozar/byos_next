'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from 'lucide-react';

export const DatabaseInitPrompt = ({ errorMessage }: { errorMessage: string }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoToMaintenance = () => {
    setIsLoading(true);
    router.push('/maintenance');
  };

  return (
    <Card className="w-full shadow-md gap-2">
      <CardHeader>
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <CardTitle>Database Initialization Required</CardTitle>
        </div>
        <CardDescription>
          <p className="leading-7">
            The database tables required for this application are missing: {errorMessage}
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
       <p className="leading-7">
          You have two options:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm space-y-0">
          <li className="leading-7">Go to the maintenance page to initialize the database with proper tables and schema</li>
          <li className="leading-7">or continue using the application in no-DB mode, which will have limited functionality</li>
        </ul>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleGoToMaintenance}
          disabled={isLoading}
          className="gap-1"
        >
          Go to Maintenance
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}; 