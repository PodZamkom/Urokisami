import fetch from 'node-fetch';

async function test() {
    console.log("Testing API endpoints...");
    const sessionId = "test-session-" + Date.now();

    try {
        // 1. Start session
        const startRes = await fetch('http://localhost:3005/api/sessions/start', {
            method: 'POST',
            body: JSON.stringify({
                id: sessionId,
                username: "Tester",
                contact: "test@example.com",
                startTime: Date.now()
            })
        });
        console.log("Start session:", await startRes.json());

        // 2. Add log
        const logRes = await fetch(`http://localhost:3005/api/sessions/${sessionId}/log`, {
            method: 'POST',
            body: JSON.stringify({
                timestamp: Date.now(),
                sender: "user",
                text: "Hello from test script"
            })
        });
        console.log("Add log:", await logRes.json());

        // 3. Add event
        const eventRes = await fetch(`http://localhost:3005/api/sessions/${sessionId}/event`, {
            method: 'POST',
            body: JSON.stringify({
                timestamp: Date.now(),
                type: "action",
                content: "Test action performed"
            })
        });
        console.log("Add event:", await eventRes.json());

        // 4. End session
        const endRes = await fetch(`http://localhost:3005/api/sessions/${sessionId}/end`, {
            method: 'POST',
            body: JSON.stringify({
                endTime: Date.now(),
                image: "data:image/jpeg;base64,mockdata"
            })
        });
        console.log("End session:", await endRes.json());

        // 5. Get sessions (Admin)
        const adminRes = await fetch('http://localhost:3005/api/admin/sessions');
        const sessions = await adminRes.json();
        console.log("Admin sessions count:", sessions.length);
        const found = sessions.find(s => s.id === sessionId);
        console.log("Found our session in admin list:", found ? "YES" : "NO");

    } catch (e) {
        console.error("Test failed:", e.message);
        console.log("Note: This test requires the proxy-server to be running and MongoDB available.");
    }
}

test();
