import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = process.env.NOTION_TOKEN_DAVID;
    const databaseId = process.env.NOTION_DATABASE_DAVID;

    if (!token || !databaseId) {
      return res.status(500).json({
        error: 'Missing Notion configuration for David'
      });
    }

    const notion = new Client({ auth: token });

    // Get database information
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });

    // Extract property information
    const properties = database.properties;
    const propertyInfo = Object.keys(properties).map(key => ({
      name: key,
      type: properties[key].type,
      description: getPropertyDescription(properties[key])
    }));

    return res.status(200).json({
      success: true,
      databaseTitle: (database as any).title?.[0]?.plain_text || 'Untitled',
      properties: propertyInfo,
      rawProperties: properties
    });

  } catch (error) {
    console.error('❌ Database info error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get database info',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function getPropertyDescription(property: any): string {
  switch (property.type) {
    case 'title':
      return 'Title property (primary)';
    case 'rich_text':
      return 'Rich text property';
    case 'multi_select':
      return `Multi-select property with options: ${property.multi_select?.options?.map((opt: any) => opt.name).join(', ') || 'none'}`;
    case 'select':
      return `Select property with options: ${property.select?.options?.map((opt: any) => opt.name).join(', ') || 'none'}`;
    case 'date':
      return 'Date property';
    case 'number':
      return 'Number property';
    default:
      return `${property.type} property`;
  }
} 