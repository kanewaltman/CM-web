import React, { useEffect, useState } from 'react';

interface PageContent {
  title: string;
  slug: string;
  type: string;
}

export const VisualEditorExample: React.FC = () => {
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch this from your API or content system
    fetch('/content/pages/home.json')
      .then(response => response.json())
      .then(data => {
        setPageContent(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading page content:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!pageContent) {
    return <div>No content found</div>;
  }

  return (
    <div className="visual-editor-example">
      {/* The data-sb-object-id attribute connects this element to the content file */}
      <div data-sb-object-id="content/pages/home.json">
        <h1 data-sb-field-path="title">{pageContent.title}</h1>
        <p>This is an example component that can be edited with Netlify Visual Editor.</p>
      </div>
    </div>
  );
};

export default VisualEditorExample; 