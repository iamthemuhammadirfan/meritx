<?php
// Spaceship PHP endpoint. The Next.js application itself remains a static export.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(int $status, array $body): void { http_response_code($status); echo json_encode($body); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { header('Allow: POST'); respond(405, ['ok'=>false,'message'=>'Please use the enquiry form to send a message.']); }
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && !in_array($origin, ['https://meritxsc.com','https://www.meritxsc.com'], true)) { respond(403, ['ok'=>false,'message'=>'Please submit your enquiry from meritxsc.com.']); }
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 24000) { respond(413, ['ok'=>false,'message'=>'Your message is too long. Please shorten it and try again.']); }
$isJson = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false;
$input = $isJson ? json_decode(file_get_contents('php://input', false, null, 0, 24001), true) : $_POST;
if (!is_array($input)) { respond(400, ['ok'=>false,'message'=>'The form could not be read. Please try again.']); }
function field(array $data, string $key): string { return isset($data[$key]) && is_string($data[$key]) ? trim($data[$key]) : ''; }
if (field($input, 'website') !== '') { respond(200, ['ok'=>true]); }
$name=field($input,'name'); $email=field($input,'email'); $company=field($input,'company'); $phone=field($input,'phone'); $service=field($input,'service'); $message=field($input,'message');
$allowed=['Software & business systems','IT equipment & procurement','Networking & infrastructure','CCTV & surveillance','Installation & technical support','Tender or BOQ quotation','Multiple services / General enquiry'];
if (strlen($name)<2 || strlen($name)>240 || !filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($email)>254 || strlen($company)>320 || strlen($phone)>80 || !in_array($service,$allowed,true) || strlen($message)<20 || strlen($message)>10000 || field($input,'privacy')!=='accepted') { respond(422, ['ok'=>false,'message'=>'Please check your name, email, selected service, message and privacy consent.']); }
$docroot=$_SERVER['DOCUMENT_ROOT'] ?? '';
if (!$docroot || !is_dir($docroot)) { respond(503,['ok'=>false,'message'=>'The enquiry service is unavailable. Please contact us by phone, email or WhatsApp.']); }
$directory=dirname(rtrim($docroot,'/')).'/.meritx-enquiries';
if (!is_dir($directory) && !@mkdir($directory,0700,true)) { respond(503,['ok'=>false,'message'=>'We could not save your enquiry. Please contact us directly.']); }
$ipKey=hash('sha256',($_SERVER['REMOTE_ADDR'] ?? 'unknown').'meritx-enquiry');
$rateFile=$directory.'/.rate-'.$ipKey;
$lock=@fopen($rateFile,'c+');
if (!$lock || !flock($lock,LOCK_EX)) { if ($lock) fclose($lock); respond(503,['ok'=>false,'message'=>'Please try again in a moment.']); }
@chmod($rateFile,0600);
$history=json_decode(stream_get_contents($lock),true);
$history=is_array($history)?array_values(array_filter($history,static function($time){ return is_numeric($time) && $time>time()-900; })):[];
if (count($history)>=5) { flock($lock,LOCK_UN); fclose($lock); header('Retry-After: 900'); respond(429,['ok'=>false,'message'=>'You have sent several enquiries. Please wait 15 minutes or contact us directly.']); }
$reference='MX-'.gmdate('Ymd').'-'.strtoupper(bin2hex(random_bytes(4)));
$record=['reference'=>$reference,'received_at'=>gmdate('c'),'name'=>$name,'email'=>$email,'company'=>$company,'phone'=>$phone,'service'=>$service,'message'=>$message,'consent'=>true];
$target=$directory.'/'.$reference.'.json';
$written=@file_put_contents($target,json_encode($record,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE),LOCK_EX);
if ($written===false) { flock($lock,LOCK_UN); fclose($lock); respond(503,['ok'=>false,'message'=>'We could not save your enquiry. Please call, email or WhatsApp us.']); }
@chmod($target,0600);
$history[]=time(); rewind($lock); ftruncate($lock,0); fwrite($lock,json_encode($history)); fflush($lock); flock($lock,LOCK_UN); fclose($lock);
$body="New MeritX website enquiry\nReference: ".$reference."\n\nName: ".$name."\nEmail: ".$email."\nCompany: ".$company."\nPhone: ".$phone."\nService: ".$service."\n\n".$message;
$headers=['From: MeritX Website <info@meritxsc.com>','Reply-To: '.$email,'Content-Type: text/plain; charset=UTF-8','Message-ID: <'.strtolower($reference).'@meritxsc.com>'];
// The envelope sender matches the configured domain; Reply-To remains the visitor.
// Acceptance by the hosting mail system is recorded separately from inbox delivery.
$accepted=false;
if (function_exists('mail')) { $accepted=@mail('info@meritxsc.com','MeritX enquiry '.$reference,$body,implode("\r\n",$headers),'-finfo@meritxsc.com'); }
$record['notification']=['recipient'=>'info@meritxsc.com','transport'=>'hosting-mail','status'=>$accepted?'accepted':'not_accepted','attempted_at'=>gmdate('c')];
@file_put_contents($target,json_encode($record,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE),LOCK_EX);
@chmod($target,0600);
respond(201,['ok'=>true,'reference'=>$reference]);
