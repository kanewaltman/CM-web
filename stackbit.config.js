module.exports = {
  stackbitVersion: "~0.6.0",
  nodeVersion: "18",
  contentSources: [
    {
      name: "git",
      rootPath: __dirname,
      contentDirs: ["content"],
      models: [
        {
          name: "Page",
          type: "page",
          urlPath: "/{slug}",
          filePath: "content/pages/{slug}.json",
          fields: [
            { name: "title", type: "string", required: true },
            { name: "slug", type: "string", required: true },
            { name: "type", type: "string", required: true }
          ]
        }
      ],
      assetsConfig: {
        referenceType: "static",
        staticDir: "public",
        uploadDir: "assets/images",
        publicPath: "/"
      }
    }
  ],
  ssgName: "custom",
  devCommand: "npm run dev",
  buildCommand: "npm run build",
  publishDir: "dist",
  containerPort: 5173
}; 