<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PHP Website on DeployHub</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0B1120; color: #F8FAFC; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #172033; border: 1px solid #263449; padding: 32px; border-radius: 16px; text-align: center; max-width: 520px; }
    h1 { color: #A855F7; margin: 0 0 12px 0; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.6; }
    .badge { background: #7E22CE; color: #fff; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-bottom: 16px; }
    .time { font-family: monospace; color: #22D3EE; background: #0B1120; padding: 8px 12px; border-radius: 8px; border: 1px solid #263449; display: inline-block; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">PHP Isolated Runtime</div>
    <h1>Hello from PHP 8.4!</h1>
    <p>Executed dynamically inside an isolated container worker on DeployHub.</p>
    <div class="time">Server Time: <?php echo date('Y-m-d H:i:s T'); ?></div>
  </div>
</body>
</html>
