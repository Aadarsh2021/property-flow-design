import React, { useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

export const ReduxDevTools: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const state = useAppSelector(state => state);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            Redux State
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="w-96 max-h-96 overflow-auto">
            <CardHeader>
              <CardTitle className="text-sm">Redux State</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
                {JSON.stringify(state, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
