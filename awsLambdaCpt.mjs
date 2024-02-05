import https from 'https';

const commonHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
};

// Helper function to make HTTPS requests
function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
        if (body) {
            req.write(body);
        }
        req.end();
    });
}

const handler = async (event) => {
    const gistId = 'a4704cab68edf5aafc88e1b787cf3077';
    const token = process.env.GITHUB_TOKEN; // Ensure this is set in your Lambda environment variables
    const path = `/gists/${gistId}`;
    const hostname = 'api.github.com';

    // Handle CORS preflight (OPTIONS) request
    if (event.httpMethod === 'OPTIONS') {
        console.log("CORS OPTIONS");
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }

    const headers = {
        'Authorization': `token ${token}`,
        'User-Agent': 'GitHub Gist Lambda Function',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        console.log('HTTP Method:', event.httpMethod);
        console.log('Event Body:', event.body);        
        
        const requestBody = JSON.parse(event.body || '{}');
        let action = requestBody.action;
        let key = requestBody.key;
        let value = requestBody.value;

        // Fetch the current content of cpt.json
        const options = { hostname, path, headers, method: 'GET' };
        const gist = await httpsRequest(options);
        const currentContent = gist.files['cpt.json'] ? JSON.parse(gist.files['cpt.json'].content) : {};

        if (action === 'append') {
            // Append new data
            currentContent[key] = value;
            const updateOptions = {
                hostname,
                path,
                headers: headers,
                method: 'PATCH',
            };
            const updateBody = JSON.stringify({
                files: {
                    'cpt.json': { content: JSON.stringify(currentContent, null, 2) },
                },
            });
            await httpsRequest(updateOptions, updateBody);
            return { statusCode: 200, body: JSON.stringify({status: 'OK'}) };
        } else if (action === 'fetchAllKeys') {
            // Fetch all top-level keys
            return { statusCode: 200, body: JSON.stringify(Object.keys(currentContent)) };
        } else if (action === 'fetchByKey') {
            // Fetch a specific key
            if (key in currentContent) {
                return { statusCode: 200, body: JSON.stringify(currentContent[key]) };
            } else {
                return { statusCode: 404, body: JSON.stringify({error: "key not found"}) };
            }
        }

    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({error: 'Internal Server Error'}) };
    }
};

export { handler };
