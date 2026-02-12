<?php
$clickid = isset($_GET['clickid']) ? (string) $_GET['clickid'] : '';
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generate</title>
</head>
<body>
  <h1>Generate endpoint</h1>
  <p>ClickID получен.</p>
  <script>
    window.clickid = <?php echo json_encode($clickid, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    console.log('clickid:', window.clickid);
  </script>
</body>
</html>
