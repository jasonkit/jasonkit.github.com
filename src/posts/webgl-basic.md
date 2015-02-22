---
title: Basic WebGL for GPGPU
date: 2015-02-22
---
# Introduction
Computer simulation is always fascinating to me, and I would like to learn by doing it.
I have written a [cloth simulation](http://jasonkit.github.io/webgl/3dcloth/) for this purpose.
And this is a short series of posts for documenting this work and everything I learned while writing it.

Computer simulation usually require intensive computation which takes lots of time if they are solely done on CPU.
It is good that GPU are now readily available in every platform, this gives us an opportunity do cheap parallel
computing by means of GPGPU.

Moreover, to make think more interesting, I decided to do the simulation on web :)

# Online Resource on 3D Graphics Rendering
To do GPGPU on web, unless WebCL is widely supported, WebGL is the only choice. We need to
know enough WebGL before working on GPGPU; while good understanding
on how 3D rendering work is a prerequisite for WebGL.

I have collected a few resources for learning 3D rendering and WebGL. By reading them, we should have
enough knowledge to proceed.

* [3D Graphics with OpenGL Basic Theory](http://www.ntu.edu.sg/home/ehchua/programming/opengl/CG_BasicsTheory.html)
gives a concise introduction on the rendering pipeline, complementary with code example. Although some part are incomplete,
such as the shader part which is the essence of GPGPU, it is still a place good place for learning OpenGL.
* [OpenGL tutorial from songho.ca](http://www.songho.ca/opengl/index.html), in depth discussion on most of the basic part
of OpenGL, it is good to at least read the sections on [Transformation](http://www.songho.ca/opengl/gl_transform.html),
[VBO](http://www.songho.ca/opengl/gl_vbo.html) and [FBO](http://www.songho.ca/opengl/gl_fbo.html).

* [WebGL API and GLSL Reference Card](https://www.khronos.org/files/webgl/webgl-reference-card-1_0.pdf) for quick look on
WebGL API and GLSL.

# General Structure of Vertex and Fragment Shader
Following are the sample vertex and fragment shader shown in the reference card, I will give some comment on the their
general structure.

``` glsl
// Vertex shader
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
* *uniform* variables are read-only, and all shader units will get the same value, hence
they also be consider as user defined constants. Noted that *uniform* variables are per-program entities,
both vertex and fragment can read *uniform* variables. If *uniform* variables are declared in both shaders
with the same name, they are actually referring to the same entity.
* An *attribute* variable is associated a VBO, different shader units will get different entry in a VBO for
the *attribute* variable.
* Only vertex shader has *attribute* variables.
* *Varying* variables are the bridge between vertex shader and fragment, they should be appear in both shaders.
*Varying* variables are read-only in fragment shader but read- and writeable in vertex shader. Noticed that value
of *varying* variables read by fragment shader are interpolated.
* *gl_Position* is the compulsory output variable, every vertex shader should write to this variable.

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
* First line is the *precision statement*, it is for setting the type precision globally in a fragment shader. It is
also possible to set precision for each variable individually using *highp*, *mediump* or *lowp* qualifier.
* *sampler2D* is the identifier for 2D texture, its type is an integer starting from 0.
* *gl_FragColor* is the compulsory output variable for fragment shader.
* Only fragment shader can access texture.

# GPGPU using WebGL
GPGPU using WebGL is simply writing shaders that are not for rendering purpose. Noticed that it is possible
to ask WebGL to render on a texture instead of on screen, and the value of texture can be read back,
hence rendering is equivalent to computing. Textures are acted as containers of input and output data
under this framework.

In practice, GPGPU using WebGL is no more than drawing a textured square. For more detail, readers can have read
on following website:
* [GPGPU::Basic Math / FBO Tutorial](http://www.mathematik.uni-dortmund.de/~goeddeke/gpgpu/tutorial.html)

# Sample Code - Gaussian Filter
Following are the sample code for applying a 3x3 Gaussian Filter on an image using WebGL.
This example basically captures all the detail for GPGPU using WebGL, i.e. drawing a textured square.
Full listing of the code can be found [here](https://github.com/jasonkit/webgl/blob/master/gpgpu-posts/gpgpu1/rena.js).

``` javascript
var gl = canvas_out.getContext("experimental-webgl");
gl.viewport(0, 0, w, h);
```
* *viewport()* is used for specifying the output region of WebGL rendering, `w` and `h` are the size the image.

``` javascript
var vtx_shader = gl.createShader(gl.VERTEX_SHADER);
var frag_shader = gl.createShader(gl.FRAGMENT_SHADER);

var vtx_shader_source = "                      \
attribute vec2 a_vpos;                         \
attribute vec2 a_tpos;                         \
varying vec2 v_tpos;                           \
void main(void) {                              \
    gl_Position = vec4(a_vpos, 0.0, 1.0);      \
    v_tpos = a_tpos;                           \
}                                              \
";

var frag_shader_source = "                                          \
precision highp float;                                              \
varying vec2 v_tpos;                                                \
uniform vec2 u_size;                                                \
uniform sampler2D u_texture;                                        \
uniform mat3 u_kernel;                                              \
void main(void) {                                                   \
    vec2 delta = 1.0/u_size;                                        \
    vec4 color = vec4(0,0,0,0);                                     \
    for (int i=0; i<=2; i++) {                                      \
        for (int j=0; j<=2; j++) {                                  \
            vec2 offset = v_tpos + vec2(i-1, j-1)*delta;            \
            color += u_kernel[i][j]*texture2D(u_texture, offset);   \
        }                                                           \
    }                                                               \
    gl_FragColor = color;                                           \
}                                                                   \
";

gl.shaderSource(vtx_shader, vtx_shader_source);
gl.shaderSource(frag_shader, frag_shader_source);
gl.compileShader(vtx_shader);
gl.compileShader(frag_shader);

if (!gl.getShaderParameter(vtx_shader, gl.COMPILE_STATUS)){
    console.log(gl.getShaderInfoLog(vtx_shader));
}
if (!gl.getShaderParameter(frag_shader, gl.COMPILE_STATUS)){
    console.log(gl.getShaderInfoLog(frag_shader));
}
```
* For every resource we want to have on GPU, it should be acquired by using corresponding
create method, such as *createShader()*, *createProgram()*, *createBuffer()* and *createTexture()*.
* GLSL code are supplied as plain text, a more flexible way is to load GLSL code through ajax call.
* If there are compile error for the GLSL code, *getShaderInfoLog()* can be used to retrieve the error
message.
* Notice how we access can any pixel in a texture if we known its size in the fragment shader.

``` javascript
var program = gl.createProgram();
gl.attachShader(program, vtx_shader);
gl.attachShader(program, frag_shader);
gl.linkProgram(program);
gl.useProgram(program);
```
* Each program is consist of both vertex and fragment shader, and we can create any combination of them.

``` javascript
var a_vpos = gl.getAttribLocation(program, "a_vpos");   // vertex coordinate
var a_tpos = gl.getAttribLocation(program, "a_tpos");   // texture coordinate
var u_size = gl.getUniformLocation(program, "u_size");  // size of the texture
var u_texture = gl.getUniformLocation(program, "u_texture"); // texture id, use 0 for TEXTURE0
var u_kernel = gl.getUniformLocation(program, "u_kernel");   // 3x3 kernel to apply

gl.enableVertexAttribArray(a_vpos);
gl.enableVertexAttribArray(a_tpos);
gl.uniform2fv(u_size, new Float32Array([w, h]));
gl.uniform1i(u_texture, 0);

var gaussian = new Float32Array([0.0625, 0.125, 0.0625,
                                  0.125,  0.25,  0.125,
                                 0.0625, 0.125, 0.0625]); 
gl.uniformMatrix3fv(u_kernel, false, gaussian);  
```
* As shader are compiled, WebGL knows the name of all those attribute and uniform variables, we can obtain their
handle by calling *getAttribLocation()* and *getUniformLocation()* with their names.
* attribute variables need to be enabled by calling *enableVertexAttribarray()*.
* We can assign values to uniform variables by call uniform method corresponding to their their type.
Noticed that a typed array is expected if the type is not a scalar, 

``` javascript
var vpos_buf = gl.createBuffer();
var tpos_buf = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, vpos_buf);
// order: Bottom-Left, Bottom-Right, Top-Right, Top-Left
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);
gl.vertexAttribPointer(a_vpos, 2, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, tpos_buf);
// corresponding texture coordinate
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 1,1, 0,1]), gl.STATIC_DRAW);
gl.vertexAttribPointer(a_tpos, 2, gl.FLOAT, false, 0, 0);
```
* To assign attribute variable, we first need to acquire a *Vertex Buffer Object (VBO)*
by calling *createBuffer()*, then use *bufferData()* to transfer the data from CPU to GPU,
finally call *vertexAttribPointer()* to tell WebGl the binding buffer is associated to which attribute variable.
* Notice that *bufferData()* and *vertexAttribPointer()* don't require passing the VBO handle as an argument,
they always works on latest bound buffer.
* If the buffer content update frequently, say every frame, use *DYNAMIC_DRAW*; otherwise use *STATIC_DRAW*.

``` javascript
var texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas_in);
gl.activeTexture(gl.TEXTURE0);
```
* Description of *texParameteri()* can be found [here](https://www.khronos.org/opengles/sdk/docs/man/xhtml/glTexParameter.xml).
* Using *TEXTURE0* is corresponding to assigning 0 to `u_texture`.

``` javascript
var idx_buf = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx_buf);
// We will draw the square as triangle strip
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,3,2]), gl.STATIC_DRAW);
```
* This is the *Index Buffer Object (IBO)*, noticed that *ELEMENT_ARRAY_BUFFER* is passed to *bindBuffer()*,
  which is different from VBO.
* IBO tells how vertices are connected to form primitive, here we are using *TRIANGLE_STRIP* to draw a square.

``` javascript
gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0);
```
* Finally, *drawElements()* will trigger the rendering, it worked with the bound IBO.

As we can see, writing raw WebGL code is tedious, it is good to have a library save some typing,
[stack.gl](http://stack.gl) could be a good choice for that.

# Note on texImage2D()
The way *texImage2D()* reading in a texture is somehow unusual. It fills the bottom of the texture
first and goes up, hence if we simply feed in a normal image, the texture in GPU will be upside down.
To fix this, either we adjust the texture coordinate according, or we can flip the image before calling *texImage2D()*.
Similar phenomenon is happened on *readPixels()* for reading pixel from framebuffer.

# Demo
On the left is `#canvas_in` and on the right is `#canvas_out`.
<div style="text-align:center">
<canvas id="canvas_in"></canvas>
<canvas id="canvas_out"></canvas>
</div>
We can see image on right is blurred.

# From Drawing Textured Square to GPGPU
In the Gaussian filter sample code, we are reading a RGBA image with 8-bit unsigned integer per channel as a texture.
In GPGPU, most of the case we will deal with floating-point data, hence we usually want the RGBA "image" has 32-bit
float per channel by changing *gl.UNSIGNED_BYTE* to *gl.FLOAT*. Noticed not all platform and all GPU support
floating-point texture, we need to test with
``` javascript
gl.getExtenion("OES_texture_float");
```

Moreover, in the sample code, we render to the default framebuffer, i.e. the screen. In GPGPU, we will render to
another floating-point texture. Unfortunately, according to [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/WebGL/WebGL_best_practices)

> Rendering to a floating-point texture may not be supported, even if the OES_texture_float extension is supported.
Typically, this fails on current mobile hardware. To check if this is supported, you have to call the WebGL
checkFramebufferStatus() function.

In desktop case, latest Firefox and Google Chrome should support rendering to floating-point texture, but not Safari.

Following are codes to create *FrameBuffer Object (FBO)*
``` javascript
var fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output_texture, 0);
```
Noticed that in WebGL only support one color attachment, which is *COLOR_ATTACHMENT0*.

Calling *bindFramebuffer()* will change the bound framebuffer, hence the subsequent *drawElements()* call will
render to the FBO specified in the last *bindFramebuffer()* call. To switch back to default FBO, pass `null` for
the FBO argument.
``` javascript
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
```
<script type="text/javascript" src="http://jasonkit.github.io/webgl/gpgpu-posts/gpgpu1/rena.js"></script>
