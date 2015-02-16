---
title: 用 WebGL 玩 GPGPU Part 1 － 基本 OpenGL 概念
chinese: true
date: 2015-02-13
no_comment:y
auto_reload:y
---
拎GPU嚟做 general-purpose computing 已經唔係乜嘢新鮮事，由可以用 shader 去 program GPU 同
GPU 可以做 floating-point computation 開始，[General-purpose computing on GPU (GPGPU)](http://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units)
就變得可行，其後 Nvidia 喺2007年推出嘅 CUDA 同2009年面世嘅 OpenCL 都同我地講 GPGPU 越黎越普及。
時至今日絕大部分 computing devices 都有粒 GPU 係入面，而且由 desktop app 到 mobile app 
再到 web app ，我地都可以用唔同途徑去 program 粒 GPU，既然有件咁正嘅 parallel computing
unit 係度，冇理由擺係度唔用㗎？

係呢系列嘅文章中，我會講下點係 web platform 玩 GPGPU，目標係做個簡單嘅 physics simulation。
我會用個簡單嘅 [Cloth simulation](http://jasonkit.github.io/webgl/3dcloth/) 嚟做例子，
講下點用 shader 去 program 粒 GPU、基本嘅 Cloth simulation 係計緊乜嘢數、點樣用 WebGL
去計呢堆數同點樣 render 個 simulation result 出嚟^[Rendering 呢部分其實同 GPGPU 無關，
講埋純粹想 document 晒成個 Implementation。]。

跟住落嚟我會先講啲基本嘅 3D rendering concept，如果你已經識 WebGL、OpenGL ES 或者 Modern OpenGL
^[簡單啲講即係知點寫shader，同了解graphics pipeline係乜。]，你可以放心直接睇下一Part。

# Rendering 點只 display 咁簡單
一般人提起 GPU 或者顯示卡，好多時都同打機有關，又或者工作上佢要整 3D Model，畫 CAD，
總知就係要做 rendering，但係因乜解究 rendering 要用到個專屬嘅硬件咁誇張呢？
要答呢個問題，首先大家要知道 rendering 唔係就咁指「顯示」咁簡單，而係指用模型去 generate
一幅圖。而所謂嘅「模型」(model) 可以理解成喺完成圖裡面啲物件嘅外型嘅精粹，呢啲 model 一般都會用 vertices
同一堆 sets of vertices 去表示。 Vertices 就係物件上每一個點嘅 coordinates，而 sets of vertices
就用嚟表示唔同嘅 geometric primitive (例如係一條線或者一個三角形）。
喺3D model，每一個 vertex 會跟個 normal vector 去講佢面向邊，
如果有用 texture，重會跟多個 texture coordinate 去講呢點 vertex 係對應 texture 上面嘅邊一點，
否則可以跟個 RGBA value 去表示該 vertex 嘅顏色。留意，一個 model 裡面嘅coordinates 都係對應著該 model 嘅
coordinate frame，換句話講，唔同 model 會有自己嘅 coordinate frame，
而完成圖上面每一粒 pixel 亦構成左另一個 coordinate frame。

Rendering 嘅過程中一大部分工作就係用嚟轉 coordinate frame，將每個primitive 上嘅每一個 vertex 由自己喺 model
入裡嘅 object coordinates 轉換去喺完成圖上嘅 window coordinates。因為一個 primitive
好多時都係對應完成圖上嘅一撻面積(fragment)，從 vertices 嘅 window coordinates 同該vertex 嘅 texture coordinate 
或vertex color 同埋normal，我地可以計倒係 fragment 裡面對應著 vertices 嘅 pixel 有乜嘢顏色，
因為我地重知道而家畫緊嘅 primitive 係條線定係三角形^[其他多邊形都會事先分拆成多個三角形。]，
我地可以用 interpolate 返嚟嘅 texture coordinate/vertex color 同 normal 去計埋其他 fragmant pixels
嘅顏色^[其實除左顏色，每一粒 fragment pixel 都有佢地自己嘅 depth value，呢啲 depth values 係 interpolate
primitive vertices 嘅Z coordinate 得返嚟嘅，用途係用嚟決定邊塊 fragment 係前，邊塊 fragment 係後。]。

# Graphics Pipeline 同 GPU
以上提及嘅 rendering 過程就係所謂嘅 graphics pipeline，從中我地可以見倒要 render 一幅圖係要做大量嘅 coordinate
transformation 同計算大量嘅 fragment pixel color value 同 depth value，因為一個 model 視乎佢有幾精細，
可以有成 5k 甚至 10k 粒 vertices，重要一個 scene 通常唔只得一件嘢，再加上係九成嘅3D application 都係interactive
，要有流暢嘅畫面，我地最少都要有 24 fps ，噉即係話 3D graphic rendering 唔單只係運數量多，重要計得夠快！

要解決呢個問題，一個方法係做 [clipping/culling](http://en.wikipedia.org/wiki/Clipping_(computer_graphics)) ，即係只 render 會喺原成圖見倒嘅 primitives，從而減少 rendering
嘅運算量。另一個方法係直接加快運算速度，將同 rendering 有關嘅運算交畀專屬嘅硬件，亦即係 GPU 去負責。
一粒 GPU 裡面有幾十到幾千粒運算單元，基於同一個 pipeline stage 嘅運算係獨立呢一點^[例如我地唔洗等vertex A
嘅 coordinate transform 完先至transform vertex B 嘅 coordinate，因為兩者嘅運算係獨立。]，
同一類嘅運算單元可以並行，我地可以 feed 唔同嘅 input 畀唔同嘅運算單元，但全部都係計同一條數，
亦即係做 [Single Instruction Multiple Data (SIMD)](http://en.wikipedia.org/wiki/SIMD) 並行運算。

以前嘅 GPU，呢啲並行嘅運算單元嘅功能係定死咗嘅或者只以做有限度嘅更改，但今時今日就變左 programmable ，
呢啲 programmable 嘅運算單元叫 shaders unit^[Shader unit 好似係Nvidia 用嘅term，係Intel GMA, 佢地叫Execution Units
，係 ATI GPU，佢地叫Stream Processor，係度我一概用shader unit 統稱。]，而係佢地上面行嘅程式就係 shader。

係 modern OpenGL graphics pipeline 中，我地最少需要提供兩類 shaders，分別係 vertex shader 同 fragment shader。
從佢地個名都大概可以估倒 vertex shader 係負責同每粒vertex 做 coordinare transformation，而 fragment shader 就係同每粒
fragment pixel 計佢地個 color 同 depth。

以上好概括噉介紹左 grapchis pipeline 係乜，同 GPU 可以點樣加速 rendering，想詳細知多啲關於graphics pipeline
嘅嘢，可以睇下以呢個網頁
* [3D Graphics with OpenGL Basic Theory](http://www.ntu.edu.sg/home/ehchua/programming/opengl/CG_BasicsTheory.html)

# Shader 同 GPGPU 嘅關係
GPGPU 其實就係寫啲同 rendering 無關嘅 shader 畀啲 shader units 行，目的係利用 GPU 做蔗渣價錢燒鵝味道嘅並行運算。
以前要做 GPGPU 就一定要寫 shader，但係今時今日有 OpenCL 呢個選擇，如果係target Nvidia GPU，重有 CUDA 畀你揀。
但如果係 target web platform，係 WebCL 被廣泛支援之前，唯一選擇就係經 WebGL 寫 shader 去做 GPU programming。

經 WebGL 寫 shader 所用到嘅 language 叫 [GLSL ES Ver 1.00](https://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf)，
syntax 同寫 C 差唔多，基本上識 C 都識左 GLSL 嘅八、九成，唯一要注意嘅係，一啲喺 C valid 嘅syntax，喺 GLSL ES 係 compile 唔倒，
例如 array index 只可以係 constant 或者 loop variable ⋯⋯不過寫多幾次就會知邊啲得邊啲唔得。

以下係Khronos 提供嘅 sample vertex shader 同 fragment shader，同一啲值得留意嘅地方，
詳細可以睇呢份[reference card](https://www.khronos.org/files/webgl/webgl-reference-card-1_0.pdf) 嘅第3至4頁。
``` glsl
// Vertex Shader
uniform mat4 mvp_matrix;    // model-view-projection matrix
uniform mat3 normal_matrix; // normal matrix
uniform vec3 ec_light_dir;  // light direction in eye coords
attribute vec4 a_vertex;    // vertex position
attribute vec3 a_normal;    // vertex normal
attribute vec2 a_texcoord;  // texture coordinates
varying float v_diffuse;
varying vec2 v_texcoord;

void main(void)
{
    // put vertex normal into eye coords
    vec3 ec_normal = normalize(normal_matrix * a_normal);
    // emit diffuse scale factor, texcoord, and position
    v_diffuse = max(dot(ec_light_dir, ec_normal), 0.0);
    v_texcoord = a_texcoord;
    gl_Position = mvp_matrix * a_vertex;
}
```
* *uniform* 同 *attribute* 都可以理解成 pass 俾呢個 vertex shader 嘅 input。
* *uniform* 係 read-only，同埋所有 shader units 見倒嘅 *uniform* 都係同一個value，所以可以當佢係user defined constant。
* 每個 *attribute* 其實係對應住唔同嘅array, 每個vertex shader units 會獲分配喺條 array 入面嘅一set element，例如 (x,y,z,w) homogeneous coordinate tuple。
* *attribute* 只係得 vertex shader 有。
* *varying* 可以理解成 vertex shader 同 fragment shader 之間嘅bridge，同時亦都係 fragment shader 嘅 input，但係 fragment
  shader 見倒嘅 *varying* 係經過左 interpolation 嘅。
* vertex shader 有個 complusory 嘅 output 叫 *gl_Position*，個 type 係 vec4。
``` glsl
//Fragment Shader
precision mediump float;
uniform sampler2D t_reflectance;
uniform vec4 i_ambient;
varying float v_diffuse;
varying vec2 v_texcoord;

void main (void)
{
    vec4 color = texture2D(t_reflectance, v_texcoord);
    gl_FragColor = color * (vec4(v_diffuse) + i_ambient);
}
```
* *precision* 用黎set int/float type 嘅精確度，有 *lowp*，*mediump* 同 *highp*，佢地都可以當qualifier 去set
某一個variable 嘅精確度。
* fragment shader 有自己嘅 *uniform*。
* *sampler2d* 可以理解成 2D texture 嘅 identifier。
* fragment shader 都有個 complusory 嘅 output 叫 *gl_FragColor*，個 type 都係 vec4。
* 只有fragment shader 可以access texture。

當兩個 shader 都執行完畢，嘅fragment shader 嘅 pixel color output blend 埋一齊去晒事先指定嘅 framebuffer 度，
個 framebuffer 可以顯示用嘅 framebuffer，亦都可以係一幅 texture。

雖然我地可以 program vertex shader 同 fragment shader，但係因為得 fragment shader 可以讀寫 texture，
佢係比較適合用嚟做 GPGPU。基本上 texture 就係用嚟裝 GPGPU 用嘅 input 同 output，成個用 shader 做 GPGPU
嘅 concept 其實只係 load 一幅 texture 再根據呢幅texture畫幅新嘅 texture！想要詳細解析，可以睇以下嘅網頁
* [GPGPU::Basic Math / FBO Tutorial](http://www.mathematik.uni-dortmund.de/~goeddeke/gpgpu/tutorial.html)

# 
